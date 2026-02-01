/**
 * LSP (Language Server Protocol) Routes
 * Provides REST API endpoints for code intelligence features
 */

import { Router, Request, Response } from 'express';
import { lspService, FormatOptions, Position, Range } from '../services/lsp';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// Diagnostics (Linting)
// ============================================================================

/**
 * POST /api/lsp/diagnostics
 * Analyze code and return diagnostics (errors, warnings, etc.)
 */
router.post('/diagnostics', async (req: Request, res: Response) => {
  try {
    const { uri, content, language } = req.body;

    if (!content || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, language' 
      });
    }

    const diagnostics = lspService.analyzeDiagnostics(
      uri || 'untitled',
      content,
      language
    );

    res.json({ diagnostics });
  } catch (error: any) {
    logger.error('Error analyzing diagnostics:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Autocomplete
// ============================================================================

/**
 * POST /api/lsp/completions
 * Get autocomplete suggestions at a given position
 */
router.post('/completions', async (req: Request, res: Response) => {
  try {
    const { uri, content, position, language } = req.body;

    if (!content || !position || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, position, language' 
      });
    }

    const completions = lspService.getCompletions(
      uri || 'untitled',
      content,
      position as Position,
      language
    );

    res.json({ completions });
  } catch (error: any) {
    logger.error('Error getting completions:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Hover Information
// ============================================================================

/**
 * POST /api/lsp/hover
 * Get hover information for a symbol at a given position
 */
router.post('/hover', async (req: Request, res: Response) => {
  try {
    const { uri, content, position, language } = req.body;

    if (!content || !position || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, position, language' 
      });
    }

    const hoverInfo = lspService.getHoverInfo(
      uri || 'untitled',
      content,
      position as Position,
      language
    );

    res.json({ hover: hoverInfo });
  } catch (error: any) {
    logger.error('Error getting hover info:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Go to Definition
// ============================================================================

/**
 * POST /api/lsp/definition
 * Get the definition location of a symbol
 */
router.post('/definition', async (req: Request, res: Response) => {
  try {
    const { uri, content, position, language } = req.body;

    if (!content || !position || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, position, language' 
      });
    }

    const definition = lspService.getDefinition(
      uri || 'untitled',
      content,
      position as Position,
      language
    );

    res.json({ definition });
  } catch (error: any) {
    logger.error('Error getting definition:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Find References
// ============================================================================

/**
 * POST /api/lsp/references
 * Find all references to a symbol
 */
router.post('/references', async (req: Request, res: Response) => {
  try {
    const { uri, content, position, language } = req.body;

    if (!content || !position || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, position, language' 
      });
    }

    const references = lspService.findReferences(
      uri || 'untitled',
      content,
      position as Position,
      language
    );

    res.json({ references });
  } catch (error: any) {
    logger.error('Error finding references:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Signature Help
// ============================================================================

/**
 * POST /api/lsp/signature
 * Get signature help for a function call
 */
router.post('/signature', async (req: Request, res: Response) => {
  try {
    const { uri, content, position, language } = req.body;

    if (!content || !position || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, position, language' 
      });
    }

    const signatureHelp = lspService.getSignatureHelp(
      uri || 'untitled',
      content,
      position as Position,
      language
    );

    res.json({ signatureHelp });
  } catch (error: any) {
    logger.error('Error getting signature help:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Document Symbols
// ============================================================================

/**
 * POST /api/lsp/symbols
 * Get all symbols (functions, classes, etc.) in a document
 */
router.post('/symbols', async (req: Request, res: Response) => {
  try {
    const { uri, content, language } = req.body;

    if (!content || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, language' 
      });
    }

    const symbols = lspService.extractSymbols(content, language);

    res.json({ symbols });
  } catch (error: any) {
    logger.error('Error extracting symbols:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Code Formatting
// ============================================================================

/**
 * POST /api/lsp/format
 * Format a document
 */
router.post('/format', async (req: Request, res: Response) => {
  try {
    const { content, language, options } = req.body;

    if (!content || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, language' 
      });
    }

    const formatOptions: FormatOptions = {
      tabSize: options?.tabSize || 2,
      insertSpaces: options?.insertSpaces !== false,
      trimTrailingWhitespace: options?.trimTrailingWhitespace !== false,
      insertFinalNewline: options?.insertFinalNewline !== false,
    };

    const edits = lspService.formatDocument(content, language, formatOptions);

    res.json({ edits });
  } catch (error: any) {
    logger.error('Error formatting document:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Refactoring
// ============================================================================

/**
 * POST /api/lsp/refactor
 * Get available refactoring actions for a selection
 */
router.post('/refactor', async (req: Request, res: Response) => {
  try {
    const { uri, content, range, language } = req.body;

    if (!content || !range || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, range, language' 
      });
    }

    const actions = lspService.getRefactorActions(
      uri || 'untitled',
      content,
      range as Range,
      language
    );

    res.json({ actions });
  } catch (error: any) {
    logger.error('Error getting refactor actions:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Rename Symbol
// ============================================================================

/**
 * POST /api/lsp/rename
 * Rename a symbol throughout the document
 */
router.post('/rename', async (req: Request, res: Response) => {
  try {
    const { uri, content, position, newName, language } = req.body;

    if (!content || !position || !newName || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, position, newName, language' 
      });
    }

    const workspaceEdit = lspService.renameSymbol(
      uri || 'untitled',
      content,
      position as Position,
      newName,
      language
    );

    res.json({ workspaceEdit });
  } catch (error: any) {
    logger.error('Error renaming symbol:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Quick Fix
// ============================================================================

/**
 * POST /api/lsp/quickfix
 * Get quick fixes for a diagnostic
 */
router.post('/quickfix', async (req: Request, res: Response) => {
  try {
    const { uri, content, diagnostic, language } = req.body;

    if (!content || !diagnostic || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, diagnostic, language' 
      });
    }

    // Return the quick fixes from the diagnostic
    const quickFixes = diagnostic.quickFixes || [];

    res.json({ quickFixes });
  } catch (error: any) {
    logger.error('Error getting quick fixes:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Batch Analysis
// ============================================================================

/**
 * POST /api/lsp/analyze
 * Perform full analysis on a document (diagnostics + symbols)
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { uri, content, language } = req.body;

    if (!content || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, language' 
      });
    }

    const diagnostics = lspService.analyzeDiagnostics(
      uri || 'untitled',
      content,
      language
    );

    const symbols = lspService.extractSymbols(content, language);

    res.json({ 
      diagnostics, 
      symbols,
      summary: {
        errorCount: diagnostics.filter(d => d.severity === 'error').length,
        warningCount: diagnostics.filter(d => d.severity === 'warning').length,
        infoCount: diagnostics.filter(d => d.severity === 'info').length,
        hintCount: diagnostics.filter(d => d.severity === 'hint').length,
        symbolCount: symbols.length,
      }
    });
  } catch (error: any) {
    logger.error('Error analyzing document:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
