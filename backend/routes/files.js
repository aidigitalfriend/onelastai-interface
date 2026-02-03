/**
 * FILE PROCESSING ROUTES
 * Handles file uploads and text extraction (PDF, DOCX, etc.)
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import * as jose from 'jose';

const router = express.Router();
const prisma = new PrismaClient();

const SUBDOMAIN_SECRET = process.env.SUBDOMAIN_TOKEN_SECRET || process.env.JWT_SECRET || 'neural-link-secret';

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

const requireAuth = async (req, res, next) => {
  try {
    // Check main site's shared session cookie
    const mainSiteSessionId = req.cookies?.session_id || req.cookies?.sessionId;
    
    if (mainSiteSessionId) {
      const mainUser = await prisma.$queryRaw`
        SELECT id, email, name, "sessionId", "sessionExpiry" 
        FROM "User" 
        WHERE "sessionId" = ${mainSiteSessionId} 
        AND ("sessionExpiry" IS NULL OR "sessionExpiry" > NOW())
        LIMIT 1
      `;
      
      if (mainUser && mainUser.length > 0) {
        const foundUser = mainUser[0];
        
        let nlUser = await prisma.user.findUnique({
          where: { onelastaiUserId: foundUser.id },
          include: { credits: true },
        });
        
        if (!nlUser) {
          nlUser = await prisma.user.create({
            data: {
              email: foundUser.email,
              name: foundUser.name || null,
              onelastaiUserId: foundUser.id,
              isVerified: true,
              credits: {
                create: {
                  balance: 5.0,
                  freeCreditsMax: 5.0,
                },
              },
            },
            include: { credits: true },
          });
        }
        
        req.user = nlUser;
        return next();
      }
    }
    
    // Fallback to Neural Link's own session cookie
    const sessionToken = req.cookies?.neural_link_session;
    
    if (!sessionToken) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const secret = new TextEncoder().encode(SUBDOMAIN_SECRET);
    const { payload } = await jose.jwtVerify(sessionToken, secret);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { credits: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth] Error:', error);
    res.status(401).json({ success: false, error: 'Invalid session' });
  }
};

// ============================================================================
// EXTRACT TEXT FROM FILE
// ============================================================================

router.post('/extract', requireAuth, async (req, res) => {
  try {
    const { fileData, fileName, mimeType } = req.body;

    if (!fileData || !fileName) {
      return res.status(400).json({ success: false, error: 'Missing file data or name' });
    }

    // Determine file type
    const ext = fileName.toLowerCase().split('.').pop();
    let extractedText = '';

    // Handle PDF files
    if (ext === 'pdf' || mimeType === 'application/pdf') {
      try {
        // Dynamic import of pdf-parse
        const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
        
        // Convert base64 to buffer
        const base64Data = fileData.replace(/^data:.*?;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;
        
        // Include PDF metadata
        const metadata = {
          pages: pdfData.numpages,
          info: pdfData.info,
        };

        return res.json({
          success: true,
          text: extractedText,
          metadata,
          fileName,
          type: 'pdf'
        });
      } catch (pdfError) {
        console.error('[Files] PDF extraction error:', pdfError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to extract PDF text. The file may be corrupted or encrypted.' 
        });
      }
    }

    // Handle DOCX files (basic extraction using mammoth)
    if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const mammoth = (await import('mammoth')).default;
        
        const base64Data = fileData.replace(/^data:.*?;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;

        return res.json({
          success: true,
          text: extractedText,
          fileName,
          type: 'docx'
        });
      } catch (docxError) {
        console.error('[Files] DOCX extraction error:', docxError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to extract DOCX text.' 
        });
      }
    }

    // Handle DOC files (older format - limited support)
    if (ext === 'doc' || mimeType === 'application/msword') {
      return res.status(400).json({ 
        success: false, 
        error: 'Legacy .doc files are not supported. Please convert to .docx or .pdf format.' 
      });
    }

    // Handle CSV files
    if (ext === 'csv' || mimeType === 'text/csv') {
      try {
        const base64Data = fileData.replace(/^data:.*?;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        extractedText = buffer.toString('utf-8');

        return res.json({
          success: true,
          text: extractedText,
          fileName,
          type: 'csv'
        });
      } catch (csvError) {
        console.error('[Files] CSV extraction error:', csvError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to read CSV file.' 
        });
      }
    }

    // For text-based files, just decode
    if (['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'ini', 'log', 'toml'].includes(ext)) {
      try {
        const base64Data = fileData.replace(/^data:.*?;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        extractedText = buffer.toString('utf-8');

        return res.json({
          success: true,
          text: extractedText,
          fileName,
          type: ext
        });
      } catch (textError) {
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to read text file.' 
        });
      }
    }

    // Unsupported file type
    return res.status(400).json({ 
      success: false, 
      error: `Unsupported file type: .${ext}` 
    });

  } catch (error) {
    console.error('[Files] Extract error:', error);
    res.status(500).json({ success: false, error: 'Failed to extract file content' });
  }
});

// ============================================================================
// GET SUPPORTED FILE TYPES
// ============================================================================

router.get('/supported-types', (req, res) => {
  res.json({
    success: true,
    types: {
      images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
      videos: ['mp4', 'webm', 'mov', 'avi'],
      documents: ['pdf', 'docx', 'csv'],
      code: ['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'scss', 'java', 'cpp', 'c', 'h', 'hpp', 'rs', 'go', 'rb', 'php', 'swift', 'kt', 'scala', 'sql', 'sh', 'bash'],
      text: ['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'ini', 'log', 'toml'],
    },
    maxSize: '10MB',
    notes: {
      pdf: 'Text extraction supported',
      docx: 'Text extraction supported',
      doc: 'Not supported - please convert to .docx',
      images: 'Vision analysis supported with compatible models',
    }
  });
});

export default router;
