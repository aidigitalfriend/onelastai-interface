import React, { useState, useMemo, useCallback } from 'react';
import { FileNode } from '../types';
import { useStore } from '../store/useStore';
import { isDarkTheme } from '../utils/theme';

// File error tracking - can be extended to integrate with linting/TypeScript
interface FileError {
  path: string;
  count: number;
  severity: 'error' | 'warning' | 'info';
}

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  fileErrors?: FileError[];
}

// SVG Icons for a cleaner, more professional look
const Icons = {
  // Folders
  folderClosed: (color: string = '#90a4ae') => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
    </svg>
  ),
  folderOpen: (color: string = '#ffca28') => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
      <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
    </svg>
  ),
  // Special folders
  folderSrc: (isOpen: boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={isOpen ? '#42a5f5' : '#64b5f6'}>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      {isOpen && <path d="M4 8h16v10H4z" fill="#1976d2" opacity="0.3"/>}
    </svg>
  ),
  folderComponents: (isOpen: boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={isOpen ? '#ab47bc' : '#ba68c8'}>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
    </svg>
  ),
  folderNode: (isOpen: boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={isOpen ? '#8bc34a' : '#9ccc65'}>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
    </svg>
  ),
  folderPublic: (isOpen: boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={isOpen ? '#26a69a' : '#4db6ac'}>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
    </svg>
  ),
  folderServer: (isOpen: boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={isOpen ? '#ff7043' : '#ff8a65'}>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
    </svg>
  ),
  folderConfig: (isOpen: boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={isOpen ? '#78909c' : '#90a4ae'}>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
    </svg>
  ),
  // File types
  typescript: () => (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="2" fill="#3178c6"/>
      <path d="M13.5 12v6.5h-2V12H9v-1.5h7V12h-2.5z" fill="white"/>
      <path d="M17.5 18.5c-.8 0-1.4-.2-1.8-.5-.4-.4-.6-.9-.6-1.5h1.6c0 .3.1.5.3.6.2.2.4.2.7.2.3 0 .5-.1.6-.2.2-.1.2-.3.2-.5 0-.2-.1-.4-.3-.5-.2-.1-.5-.2-.9-.3-.5-.1-.9-.3-1.3-.5-.3-.2-.6-.4-.8-.7-.2-.3-.3-.6-.3-1 0-.6.2-1 .6-1.4.4-.3 1-.5 1.7-.5.7 0 1.3.2 1.7.5.4.4.6.9.6 1.5h-1.6c0-.3-.1-.5-.2-.6-.2-.1-.4-.2-.6-.2-.2 0-.4.1-.5.2-.1.1-.2.3-.2.5 0 .2.1.3.3.5.2.1.5.2.9.3.5.1.9.3 1.2.5.3.2.6.4.8.7.2.3.3.6.3 1 0 .6-.2 1.1-.6 1.4-.4.4-1 .5-1.8.5z" fill="white"/>
    </svg>
  ),
  javascript: () => (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="2" fill="#f7df1e"/>
      <path d="M7 18.5V11h2v7.2c0 .2.1.3.1.4.1.1.2.1.4.1.3 0 .5-.1.6-.3.1-.2.2-.5.2-.9h2c0 .8-.2 1.4-.6 1.8-.4.4-1 .6-1.8.6-.7 0-1.2-.2-1.6-.5-.4-.4-.6-.9-.6-1.6h.3zm7-7.5h2v5.5c0 .3.1.5.2.6.1.2.3.2.6.2.3 0 .5-.1.6-.3.2-.2.2-.5.2-.9V11h2v5.7c0 .8-.2 1.3-.7 1.7-.4.4-1 .6-1.8.6-.8 0-1.4-.2-1.8-.6-.4-.4-.7-1-.7-1.7V11h-.6z" fill="black"/>
    </svg>
  ),
  react: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#61dafb">
      <circle cx="12" cy="12" r="2.5"/>
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#61dafb" strokeWidth="1"/>
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#61dafb" strokeWidth="1" transform="rotate(60 12 12)"/>
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#61dafb" strokeWidth="1" transform="rotate(120 12 12)"/>
    </svg>
  ),
  html: () => (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M4 2l1.5 17L12 22l6.5-3L20 2H4z" fill="#e44d26"/>
      <path d="M12 4v16l5-2.5L18 4H12z" fill="#f16529"/>
      <path d="M8 7h8l-.2 2H8.2L8.4 11h7l-.4 5-3 1-3-1-.2-2h2l.1 1 1.1.3 1.1-.3.2-2H8l-.4-5h.4z" fill="white"/>
    </svg>
  ),
  css: () => (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M4 2l1.5 17L12 22l6.5-3L20 2H4z" fill="#1572b6"/>
      <path d="M12 4v16l5-2.5L18 4H12z" fill="#33a9dc"/>
      <path d="M16 7H8l.2 2h7.4l-.4 5-3.2 1-3.2-1-.2-2h2l.1 1 1.3.4 1.3-.4.2-2H8l-.2-2-.2-2h8.4l-.2 2z" fill="white"/>
    </svg>
  ),
  json: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fbc02d">
      <path d="M5 3h2v2H5v5a2 2 0 01-2 2 2 2 0 012 2v5h2v2H5c-1.1 0-2-.9-2-2v-4c0-.6-.4-1-1-1H1v-2h1c.6 0 1-.4 1-1V5c0-1.1.9-2 2-2zm14 0c1.1 0 2 .9 2 2v4c0 .6.4 1 1 1h1v2h-1c-.6 0-1 .4-1 1v4c0 1.1-.9 2-2 2h-2v-2h2v-5a2 2 0 012-2 2 2 0 01-2-2V5h-2V3h2zm-7 12a1 1 0 110 2 1 1 0 010-2zm-4 0a1 1 0 110 2 1 1 0 010-2zm8 0a1 1 0 110 2 1 1 0 010-2z"/>
    </svg>
  ),
  markdown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#42a5f5">
      <path d="M2 4h20v16H2V4zm2 2v12h16V6H4zm2 2h2v4l2-2 2 2V8h2v8h-2v-4l-2 2-2-2v4H6V8zm10 0h2l2 3 2-3h2v8h-2v-5l-2 3-2-3v5h-2V8z"/>
    </svg>
  ),
  python: () => (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M12 2c-1.7 0-3.2.2-4.4.5C5.2 3.1 4 4.3 4 6v2.5c0 1.4 1.1 2.5 2.5 2.5h7c.8 0 1.5.7 1.5 1.5v1H8c-2.2 0-4 1.8-4 4v2.5c0 1.7 2 3 4.5 3.5 3 .6 5.5.5 7.5 0 1.7-.4 3-1.3 3-2.5V18c0-1.4-1.1-2.5-2.5-2.5h-7c-.8 0-1.5-.7-1.5-1.5V13h7c2.2 0 4-1.8 4-4V6c0-1.7-1.3-2.9-3.5-3.5C14.3 2.2 13.2 2 12 2z" fill="#3776ab"/>
      <circle cx="8.5" cy="6" r="1.2" fill="white"/>
      <circle cx="15.5" cy="18" r="1.2" fill="white"/>
    </svg>
  ),
  image: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#26a69a">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 4-2-2.5-3 4h12l-4-5.5z"/>
    </svg>
  ),
  git: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#f54d27">
      <path d="M21.6 11.3L12.7 2.4c-.5-.5-1.3-.5-1.8 0L8.7 4.6l2.3 2.3c.5-.2 1.1-.1 1.5.3.4.4.5 1 .3 1.5l2.2 2.2c.5-.2 1.1-.1 1.5.3.6.6.6 1.5 0 2.1-.6.6-1.5.6-2.1 0-.4-.4-.5-1-.3-1.5l-2.1-2.1v5.4c.2.1.3.2.5.3.6.6.6 1.5 0 2.1-.6.6-1.5.6-2.1 0-.6-.6-.6-1.5 0-2.1.2-.2.4-.3.6-.4V9.6c-.2-.1-.4-.2-.6-.4-.4-.4-.5-1-.3-1.5L7.8 5.4l-5.4 5.4c-.5.5-.5 1.3 0 1.8l8.9 8.9c.5.5 1.3.5 1.8 0l8.5-8.5c.5-.5.5-1.3 0-1.8z"/>
    </svg>
  ),
  env: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffc107">
      <path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4zm0 6c1.4 0 2.5 1.1 2.5 2.5 0 1-.6 1.9-1.5 2.3V14h-2v-2.2c-.9-.4-1.5-1.3-1.5-2.3C9.5 8.1 10.6 7 12 7zm-1 9h2v2h-2v-2z"/>
    </svg>
  ),
  lock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#78909c">
      <path d="M18 8h-1V6c0-2.8-2.2-5-5-5S7 3.2 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.7 1.4-3.1 3.1-3.1s3.1 1.4 3.1 3.1v2z"/>
    </svg>
  ),
  config: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#78909c">
      <path d="M19.1 12.9a7 7 0 000-1.8l1.9-1.5c.2-.1.2-.4.1-.6l-1.8-3.1c-.1-.2-.4-.3-.6-.2l-2.3.9c-.5-.4-1-.7-1.6-.9l-.3-2.4c0-.2-.3-.4-.5-.4h-3.6c-.2 0-.5.2-.5.4l-.3 2.4c-.6.2-1.1.5-1.6.9l-2.3-.9c-.2-.1-.5 0-.6.2L3.4 9c-.1.2-.1.5.1.6l1.9 1.5c-.1.6-.1 1.2 0 1.8l-1.9 1.5c-.2.1-.2.4-.1.6l1.8 3.1c.1.2.4.3.6.2l2.3-.9c.5.4 1 .7 1.6.9l.3 2.4c0 .2.3.4.5.4h3.6c.2 0 .5-.2.5-.4l.3-2.4c.6-.2 1.1-.5 1.6-.9l2.3.9c.2.1.5 0 .6-.2l1.8-3.1c.1-.2.1-.5-.1-.6l-1.9-1.5zM12 15.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/>
    </svg>
  ),
  docker: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#2496ed">
      <path d="M13.98 11.08h2.12a.19.19 0 00.19-.19V9.01a.19.19 0 00-.19-.19h-2.12a.19.19 0 00-.19.19v1.88c0 .1.09.19.19.19zm-2.95-5.43h2.12a.19.19 0 00.19-.19V3.58a.19.19 0 00-.19-.19h-2.12a.19.19 0 00-.19.19v1.88c0 .1.09.19.19.19zm0 2.71h2.12a.19.19 0 00.19-.19V6.3a.19.19 0 00-.19-.19h-2.12a.19.19 0 00-.19.19v1.87c0 .11.09.19.19.19zm-2.93 0h2.12a.19.19 0 00.19-.19V6.3a.19.19 0 00-.19-.19H8.1a.19.19 0 00-.19.19v1.87c0 .11.08.19.19.19zm-2.96 0h2.12a.19.19 0 00.19-.19V6.3a.19.19 0 00-.19-.19H5.14a.19.19 0 00-.19.19v1.87c0 .11.09.19.19.19zm5.89 2.72h2.12a.19.19 0 00.19-.19V9.01a.19.19 0 00-.19-.19h-2.12a.19.19 0 00-.19.19v1.88c0 .1.09.19.19.19zm-2.93 0h2.12a.19.19 0 00.19-.19V9.01a.19.19 0 00-.19-.19H8.1a.19.19 0 00-.19.19v1.88c0 .1.08.19.19.19zm-2.96 0h2.12a.19.19 0 00.19-.19V9.01a.19.19 0 00-.19-.19H5.14a.19.19 0 00-.19.19v1.88c0 .1.09.19.19.19zm-2.92 0h2.12a.19.19 0 00.19-.19V9.01a.19.19 0 00-.19-.19H2.22a.19.19 0 00-.19.19v1.88c0 .1.08.19.19.19zm21.54 1.65c-.39-.25-1.28-.34-1.96-.22-.09-.65-.46-1.22-.9-1.72l-.31-.25-.26.3c-.42.5-.53 1.32-.48 1.95.04.43.17.91.42 1.27-.62.34-1.62.43-2.43.42H.76a.76.76 0 00-.76.76c.01 1.42.22 2.83.66 4.18.48 1.42 1.2 2.47 2.15 3.12 1.06.73 2.79 1.15 4.75 1.15 4.46 0 8.18-2.05 9.9-6.5.65.01 2.06.02 2.78-1.37.02-.04.06-.12.18-.36l.07-.13-.22-.14z"/>
    </svg>
  ),
  prisma: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#2d3748">
      <path d="M21.81 10.25c-.06-.04-.12-.08-.19-.1l-7.19-2.48c-.13-.05-.27-.05-.4 0L6.86 10.15c-.25.09-.43.31-.47.57-.04.26.06.52.26.69l7.37 6.38c.1.09.23.14.36.14.08 0 .16-.02.24-.05l7.19-2.75c.24-.09.41-.3.46-.55.05-.25-.03-.51-.2-.69l-3.39-3.18 3.13-1.19c.23-.09.4-.29.46-.53.06-.24-.01-.49-.17-.67l-.09-.07zm-7.01 6.68l-5.42-4.69 4.16-1.59 4.33 4.06-3.07 1.17v1.05zm.38-6.09l-4.42 1.69-4.44-3.84 8.86 2.15z"/>
    </svg>
  ),
  yaml: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#f44336">
      <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zm-2-2H7v-2h10v2zm0-4H7V9h10v4z"/>
    </svg>
  ),
  file: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#90a4ae">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/>
    </svg>
  ),
  chevron: (expanded: boolean) => (
    <svg 
      width="12" 
      height="12" 
      viewBox="0 0 24 24" 
      fill="currentColor"
      style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
    >
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
    </svg>
  ),
  newFile: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 14h-3v3h-2v-3H8v-2h3v-3h2v3h3v2zm-3-7V3.5L18.5 9H13z"/>
    </svg>
  ),
  newFolder: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 6h-8l-2-2H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-1 8h-3v3h-2v-3H11v-2h3V9h2v3h3v2z"/>
    </svg>
  ),
  collapse: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 14l5-5 5 5H7z"/>
    </svg>
  ),
  refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
    </svg>
  ),
  trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  ),
};

// Get special folder icon based on folder name
const getSpecialFolderIcon = (name: string, isOpen: boolean) => {
  const lowerName = name.toLowerCase();
  if (lowerName === 'src' || lowerName === 'source') return Icons.folderSrc(isOpen);
  if (lowerName === 'components' || lowerName === 'component') return Icons.folderComponents(isOpen);
  if (lowerName === 'node_modules') return Icons.folderNode(isOpen);
  if (lowerName === 'public' || lowerName === 'static' || lowerName === 'assets') return Icons.folderPublic(isOpen);
  if (lowerName === 'server' || lowerName === 'api' || lowerName === 'backend') return Icons.folderServer(isOpen);
  if (lowerName === '.vscode' || lowerName === 'config' || lowerName === '.config') return Icons.folderConfig(isOpen);
  if (lowerName === 'services' || lowerName === 'utils' || lowerName === 'lib' || lowerName === 'helpers') return Icons.folderSrc(isOpen);
  if (lowerName === 'pages' || lowerName === 'views' || lowerName === 'screens') return Icons.folderComponents(isOpen);
  if (lowerName === 'prisma' || lowerName === 'database' || lowerName === 'db') return Icons.folderServer(isOpen);
  if (lowerName === 'test' || lowerName === 'tests' || lowerName === '__tests__' || lowerName === 'spec') return Icons.folderPublic(isOpen);
  return isOpen ? Icons.folderOpen() : Icons.folderClosed();
};

// Get file icon based on file name/extension
const getFileIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  const ext = lowerName.split('.').pop() || '';
  
  // Special file names
  if (lowerName === 'dockerfile' || lowerName.startsWith('dockerfile.')) return Icons.docker();
  if (lowerName === '.gitignore' || lowerName === '.gitattributes') return Icons.git();
  if (lowerName === '.env' || lowerName.startsWith('.env.')) return Icons.env();
  if (lowerName.includes('package-lock') || lowerName.includes('yarn.lock') || lowerName.includes('pnpm-lock')) return Icons.lock();
  if (lowerName === 'tsconfig.json' || lowerName === 'jsconfig.json') return Icons.typescript();
  if (lowerName.includes('.config.') || lowerName.includes('rc.')) return Icons.config();
  if (lowerName.endsWith('.prisma')) return Icons.prisma();
  
  // Extensions
  const iconMap: Record<string, () => JSX.Element> = {
    tsx: Icons.react,
    jsx: Icons.react,
    ts: Icons.typescript,
    js: Icons.javascript,
    mjs: Icons.javascript,
    cjs: Icons.javascript,
    html: Icons.html,
    htm: Icons.html,
    css: Icons.css,
    scss: Icons.css,
    sass: Icons.css,
    less: Icons.css,
    json: Icons.json,
    md: Icons.markdown,
    mdx: Icons.markdown,
    py: Icons.python,
    pyw: Icons.python,
    png: Icons.image,
    jpg: Icons.image,
    jpeg: Icons.image,
    gif: Icons.image,
    svg: Icons.image,
    webp: Icons.image,
    ico: Icons.image,
    yaml: Icons.yaml,
    yml: Icons.yaml,
  };
  
  return (iconMap[ext] || Icons.file)();
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ files, onFileSelect, fileErrors = [] }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/', '/src', '/components', '/server']));
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; type: 'file' | 'folder' } | null>(null);
  const [renameItem, setRenameItem] = useState<{ path: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { createFile, createFolder, deleteNode, renameNode, activeFileId, theme } = useStore();

  // Error map for quick lookup
  const errorMap = useMemo(() => {
    const map = new Map<string, FileError>();
    fileErrors.forEach(err => map.set(err.path, err));
    return map;
  }, [fileErrors]);

  // Count errors in folder (including children)
  const getFolderErrorCount = useCallback((node: FileNode): { errors: number; warnings: number } => {
    let errors = 0;
    let warnings = 0;
    
    const countErrors = (n: FileNode) => {
      const err = errorMap.get(n.path);
      if (err) {
        if (err.severity === 'error') errors += err.count;
        else if (err.severity === 'warning') warnings += err.count;
      }
      if (n.children) {
        n.children.forEach(countErrors);
      }
    };
    
    countErrors(node);
    return { errors, warnings };
  }, [errorMap]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return newExpanded;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, path: string, type: 'file' | 'folder') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, path, type });
  }, []);

  const handleNewFile = useCallback((parentPath: string) => {
    const name = prompt('Enter file name:');
    if (name) {
      createFile(parentPath, name);
      setExpandedFolders(prev => new Set(prev).add(parentPath || '/'));
    }
    setContextMenu(null);
  }, [createFile]);

  const handleNewFolder = useCallback((parentPath: string) => {
    const name = prompt('Enter folder name:');
    if (name) {
      createFolder(parentPath, name);
      setExpandedFolders(prev => new Set(prev).add(parentPath || '/'));
    }
    setContextMenu(null);
  }, [createFolder]);

  const handleDelete = useCallback((path: string) => {
    if (confirm('Delete this item?')) {
      deleteNode(path);
    }
    setContextMenu(null);
  }, [deleteNode]);

  const handleRename = useCallback((path: string, currentName: string) => {
    setRenameItem({ path, name: currentName });
    setContextMenu(null);
  }, []);

  const handleRenameSubmit = useCallback((newName: string) => {
    if (renameItem && newName && newName !== renameItem.name) {
      renameNode(renameItem.path, newName);
    }
    setRenameItem(null);
  }, [renameItem, renameNode]);

  // Filter files based on search
  const filterFiles = useCallback((nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes;
    const lowerQuery = query.toLowerCase();
    
    return nodes.reduce<FileNode[]>((acc, node) => {
      if (node.type === 'folder') {
        const filteredChildren = node.children ? filterFiles(node.children, query) : [];
        if (filteredChildren.length > 0 || node.name.toLowerCase().includes(lowerQuery)) {
          acc.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children });
        }
      } else if (node.name.toLowerCase().includes(lowerQuery)) {
        acc.push(node);
      }
      return acc;
    }, []);
  }, []);

  const filteredFiles = useMemo(() => filterFiles(files, searchQuery), [files, searchQuery, filterFiles]);

  // Theme classes - VS Code design
  const isDark = isDarkTheme(theme);
  const bgClass = isDark ? 'bg-vscode-sidebar' : 'bg-white';
  const headerBg = isDark ? 'bg-vscode-bg' : 'bg-gray-50';
  const borderClass = isDark ? 'border-vscode-border' : 'border-gray-200';
  const textClass = isDark ? 'text-vscode-text' : 'text-gray-700';
  const mutedClass = isDark ? 'text-vscode-textMuted' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-vscode-listHover' : 'hover:bg-gray-100';
  const activeBg = isDark ? 'bg-vscode-listActive' : 'bg-blue-100';
  const activeText = isDark ? 'text-white' : 'text-blue-900';

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isActive = node.id === activeFileId;
    const fileError = errorMap.get(node.path);
    const folderErrors = node.type === 'folder' ? getFolderErrorCount(node) : null;
    const isRenaming = renameItem?.path === node.path;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center h-[22px] cursor-pointer select-none group transition-colors duration-75 border-l-2
            ${isActive ? `${activeBg} ${activeText} border-vscode-accent` : `${textClass} ${hoverBg} border-transparent`}`}
          style={{ paddingLeft: `${depth * 8 + 4}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path);
            } else {
              onFileSelect(node);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, node.path, node.type)}
          onDoubleClick={() => {
            if (node.type === 'file') {
              handleRename(node.path, node.name);
            }
          }}
        >
          {/* Expand/Collapse indicator */}
          <span className={`flex-shrink-0 w-4 h-4 flex items-center justify-center ${node.type === 'folder' ? '' : 'invisible'}`}>
            {node.type === 'folder' && (
              <span className={isActive ? activeText : mutedClass}>
                {Icons.chevron(isExpanded)}
              </span>
            )}
          </span>

          {/* Icon */}
          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center mr-1">
            {node.type === 'folder' 
              ? getSpecialFolderIcon(node.name, isExpanded)
              : getFileIcon(node.name)
            }
          </span>

          {/* Name or rename input */}
          {isRenaming ? (
            <input
              type="text"
              defaultValue={renameItem.name}
              className={`flex-1 text-[12px] px-1 outline-none rounded ${isDark ? 'bg-vscode-input text-white border border-vscode-inputBorder' : 'bg-white text-gray-900 border border-blue-500'}`}
              autoFocus
              onBlur={(e) => handleRenameSubmit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit((e.target as HTMLInputElement).value);
                if (e.key === 'Escape') setRenameItem(null);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={`flex-1 text-[12px] truncate ${fileError?.severity === 'error' ? 'text-vscode-error' : fileError?.severity === 'warning' ? 'text-vscode-warning' : ''}`}>
              {node.name}
            </span>
          )}

          {/* Error/Warning badges */}
          {node.type === 'folder' && folderErrors && (folderErrors.errors > 0 || folderErrors.warnings > 0) && (
            <span className="flex gap-0.5 mr-1">
              {folderErrors.errors > 0 && (
                <span className="text-[10px] px-1 bg-vscode-error text-white rounded-sm">
                  {folderErrors.errors}
                </span>
              )}
              {folderErrors.warnings > 0 && (
                <span className="text-[10px] px-1 bg-vscode-warning text-black rounded-sm">
                  {folderErrors.warnings}
                </span>
              )}
            </span>
          )}
          
          {node.type === 'file' && fileError && (
            <span className={`text-[10px] px-1 mr-1 rounded-sm ${
              fileError.severity === 'error' 
                ? 'bg-vscode-error text-white' 
                : 'bg-vscode-warning text-black'
            }`}>
              {fileError.count}
            </span>
          )}

          {/* Monorepo indicator for package.json */}
          {node.name === 'package.json' && depth > 0 && (
            <span className="text-[9px] px-1 bg-vscode-success text-black rounded-sm mr-1">
              pkg
            </span>
          )}
        </div>

        {/* Children */}
        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children
              .sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'folder' ? -1 : 1;
              })
              .map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col ${bgClass} overflow-hidden`} onClick={() => setContextMenu(null)}>
      {/* Header */}
      <div className={`flex items-center justify-between px-2 h-[32px] ${headerBg} border-b ${borderClass}`}>
        <span className={`text-[11px] font-medium ${textClass} uppercase tracking-wide`}>
          Explorer
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() => handleNewFile('')}
            className={`p-1 rounded ${hoverBg} ${mutedClass} hover:text-white transition-colors`}
            title="New File"
          >
            {Icons.newFile()}
          </button>
          <button
            onClick={() => handleNewFolder('')}
            className={`p-1 rounded ${hoverBg} ${mutedClass} hover:text-white transition-colors`}
            title="New Folder"
          >
            {Icons.newFolder()}
          </button>
          <button
            onClick={collapseAll}
            className={`p-1 rounded ${hoverBg} ${mutedClass} hover:text-white transition-colors`}
            title="Collapse All"
          >
            {Icons.collapse()}
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1 rounded ${hoverBg} ${showSearch ? 'text-white' : mutedClass} transition-colors`}
            title="Search Files"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className={`px-2 py-1.5 border-b ${borderClass}`}>
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full text-[12px] px-2 py-1 outline-none rounded ${
              isDark ? 'bg-vscode-input text-white placeholder-vscode-textMuted border border-vscode-border focus:border-vscode-inputBorder' : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-blue-500'
            }`}
            autoFocus
          />
        </div>
      )}

      {/* File Tree */}
      <div className="flex-1 overflow-auto py-1">
        {filteredFiles.length === 0 ? (
          <div className={`px-4 py-8 text-center ${mutedClass} text-[12px]`}>
            {searchQuery ? 'No matching files' : 'No files yet'}
          </div>
        ) : (
          filteredFiles
            .sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'folder' ? -1 : 1;
            })
            .map((node) => renderNode(node))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className={`fixed z-50 ${isDark ? 'bg-vscode-panel border-vscode-border' : 'bg-white border-gray-200'} border rounded-md shadow-lg py-1 min-w-[140px]`}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={`w-full px-3 py-1.5 text-left text-[12px] ${textClass} ${hoverBg} flex items-center gap-2`}
            onClick={() => handleNewFile(contextMenu.path)}
          >
            {Icons.newFile()}
            <span>New File</span>
          </button>
          <button
            className={`w-full px-3 py-1.5 text-left text-[12px] ${textClass} ${hoverBg} flex items-center gap-2`}
            onClick={() => handleNewFolder(contextMenu.path)}
          >
            {Icons.newFolder()}
            <span>New Folder</span>
          </button>
          <div className={`border-t ${borderClass} my-1`} />
          <button
            className={`w-full px-3 py-1.5 text-left text-[12px] ${textClass} ${hoverBg} flex items-center gap-2`}
            onClick={() => handleRename(contextMenu.path, contextMenu.path.split('/').pop() || '')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            <span>Rename</span>
          </button>
          <button
            className={`w-full px-3 py-1.5 text-left text-[12px] text-red-500 ${hoverBg} flex items-center gap-2`}
            onClick={() => handleDelete(contextMenu.path)}
          >
            {Icons.trash()}
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};
