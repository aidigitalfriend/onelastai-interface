/**
 * COLLABORATION ROUTES - Real-time collaboration using Y.js
 * WebSocket server for CRDT-based document sync
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync.js';
import * as awarenessProtocol from 'y-protocols/awareness.js';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

const router = express.Router();

// Store active documents and their metadata
const documents = new Map();
const documentMetadata = new Map();
const awarenessMap = new Map();

// Message types
const messageSync = 0;
const messageAwareness = 1;

// Get or create a Y.Doc for a document name
function getYDoc(docName) {
  if (!documents.has(docName)) {
    const doc = new Y.Doc();
    documents.set(docName, doc);
    awarenessMap.set(docName, new awarenessProtocol.Awareness(doc));
    documentMetadata.set(docName, {
      collaborators: [],
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      connections: new Set(),
    });
  }
  return documents.get(docName);
}

function getAwareness(docName) {
  getYDoc(docName); // Ensure doc exists
  return awarenessMap.get(docName);
}

// ============================================================================
// REST API FOR COLLABORATION INFO
// ============================================================================

/**
 * Get active collaborators for a project
 */
router.get('/projects/:slug/collaborators', async (req, res) => {
  try {
    const { slug } = req.params;
    const doc = documents.get(slug);
    
    if (!doc) {
      return res.json({ collaborators: [] });
    }
    
    // Get awareness from the document
    const meta = documentMetadata.get(slug) || { collaborators: [] };
    
    res.json({
      success: true,
      collaborators: meta.collaborators,
      activeCount: meta.collaborators.length,
    });
  } catch (error) {
    console.error('[Collab] Get collaborators error:', error);
    res.status(500).json({ error: 'Failed to get collaborators' });
  }
});

/**
 * Get collaboration stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      activeDocuments: documents.size,
      totalConnections: Array.from(documentMetadata.values())
        .reduce((sum, meta) => sum + (meta.collaborators?.length || 0), 0),
      documents: Array.from(documentMetadata.entries()).map(([slug, meta]) => ({
        slug,
        collaborators: meta.collaborators?.length || 0,
        lastActivity: meta.lastActivity,
      })),
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('[Collab] Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ============================================================================
// WEBSOCKET SERVER SETUP
// ============================================================================

/**
 * Initialize WebSocket server for Y.js collaboration
 * @param {import('http').Server} server - HTTP server instance
 */
export function initCollaborationWS(server) {
  const wss = new WebSocketServer({ noServer: true });
  
  // Handle upgrade requests for collaboration
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    
    // Only handle /collaboration/* paths
    if (pathname.startsWith('/collaboration/')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });
  
  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;
      
      // Extract document name from path: /collaboration/{docName}
      const docName = pathname.replace('/collaboration/', '');
      
      if (!docName) {
        ws.close(4000, 'Document name required');
        return;
      }
      
      console.log(`[Collab] New connection for document: ${docName}`);
      
      // Track document
      if (!documents.has(docName)) {
        documents.set(docName, true);
        documentMetadata.set(docName, {
          collaborators: [],
          lastActivity: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
      
      // Update last activity
      const meta = documentMetadata.get(docName);
      meta.lastActivity = new Date().toISOString();
      
      // Get or create Y.Doc and Awareness
      const doc = getYDoc(docName);
      const awareness = getAwareness(docName);
      
      // Track this connection
      meta.connections.add(ws);
      
      // Send sync step 1
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeSyncStep1(encoder, doc);
      ws.send(encoding.toUint8Array(encoder));
      
      // Send awareness state
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, messageAwareness);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys()))
      );
      ws.send(encoding.toUint8Array(awarenessEncoder));
      
      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const decoder = decoding.createDecoder(new Uint8Array(message));
          const messageType = decoding.readVarUint(decoder);
          
          switch (messageType) {
            case messageSync:
              const syncEncoder = encoding.createEncoder();
              encoding.writeVarUint(syncEncoder, messageSync);
              const syncMessageType = syncProtocol.readSyncMessage(decoder, syncEncoder, doc, null);
              
              // If sync step 2 or update, broadcast to others
              if (encoding.length(syncEncoder) > 1) {
                const syncMessage = encoding.toUint8Array(syncEncoder);
                meta.connections.forEach((conn) => {
                  if (conn !== ws && conn.readyState === 1) {
                    conn.send(syncMessage);
                  }
                });
              }
              break;
              
            case messageAwareness:
              awarenessProtocol.applyAwarenessUpdate(
                awareness,
                decoding.readVarUint8Array(decoder),
                ws
              );
              
              // Broadcast awareness to all clients
              const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(
                awareness,
                Array.from(awareness.getStates().keys())
              );
              const broadcastEncoder = encoding.createEncoder();
              encoding.writeVarUint(broadcastEncoder, messageAwareness);
              encoding.writeVarUint8Array(broadcastEncoder, awarenessUpdate);
              const broadcastMessage = encoding.toUint8Array(broadcastEncoder);
              
              meta.connections.forEach((conn) => {
                if (conn.readyState === 1) {
                  conn.send(broadcastMessage);
                }
              });
              break;
          }
        } catch (err) {
          console.error('[Collab] Message handling error:', err);
        }
      });
      
      // Handle document updates
      const updateHandler = (update, origin) => {
        if (origin !== ws) {
          const updateEncoder = encoding.createEncoder();
          encoding.writeVarUint(updateEncoder, messageSync);
          syncProtocol.writeUpdate(updateEncoder, update);
          const updateMessage = encoding.toUint8Array(updateEncoder);
          
          meta.connections.forEach((conn) => {
            if (conn.readyState === 1) {
              conn.send(updateMessage);
            }
          });
        }
      };
      doc.on('update', updateHandler);
      
      // Track connection for awareness
      ws.on('close', () => {
        console.log(`[Collab] Connection closed for document: ${docName}`);
        
        // Remove from connections
        meta.connections.delete(ws);
        doc.off('update', updateHandler);
        
        // Remove awareness state
        awarenessProtocol.removeAwarenessStates(awareness, [doc.clientID], null);
        
        // Clean up if no more connections
        if (meta.connections.size === 0) {
          // Keep document in memory for a while for reconnections
          setTimeout(() => {
            const currentMeta = documentMetadata.get(docName);
            if (currentMeta && currentMeta.connections.size === 0) {
              documents.delete(docName);
              awarenessMap.delete(docName);
              documentMetadata.delete(docName);
              console.log(`[Collab] Cleaned up document: ${docName}`);
            }
          }, 30000); // 30 second grace period
        }
      });
      
    } catch (error) {
      console.error('[Collab] WebSocket connection error:', error);
      ws.close(4001, 'Connection error');
    }
  });
  
  console.log('[Collab] WebSocket server initialized');
  
  return wss;
}

// ============================================================================
// DOCUMENT PERSISTENCE (Optional - save to DB)
// ============================================================================

/**
 * Save Y.js document state to database
 */
export async function persistDocument(docName, prisma) {
  try {
    const doc = getYDoc(docName);
    if (!doc) return;
    
    const state = Y.encodeStateAsUpdate(doc);
    const stateBase64 = Buffer.from(state).toString('base64');
    
    // Save to database (you can extend this)
    await prisma.project.update({
      where: { slug: docName },
      data: {
        collaborationState: stateBase64,
        lastSavedAt: new Date(),
      },
    });
    
    console.log(`[Collab] Persisted document: ${docName}`);
  } catch (error) {
    console.error(`[Collab] Failed to persist document ${docName}:`, error);
  }
}

/**
 * Load Y.js document state from database
 */
export async function loadDocument(docName, prisma) {
  try {
    const project = await prisma.project.findUnique({
      where: { slug: docName },
      select: { collaborationState: true },
    });
    
    if (project?.collaborationState) {
      const state = Buffer.from(project.collaborationState, 'base64');
      const doc = getYDoc(docName);
      if (doc) {
        Y.applyUpdate(doc, new Uint8Array(state));
        console.log(`[Collab] Loaded document state: ${docName}`);
      }
    }
  } catch (error) {
    console.error(`[Collab] Failed to load document ${docName}:`, error);
  }
}

export default router;
