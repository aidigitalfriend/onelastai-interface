import React, { useState, useRef, useCallback, useEffect } from 'react';

type SplitDirection = 'horizontal' | 'vertical';

interface SplitPaneProps {
  children: [React.ReactNode, React.ReactNode];
  direction?: SplitDirection;
  defaultSize?: number; // percentage (0-100)
  minSize?: number; // minimum percentage
  maxSize?: number; // maximum percentage
  sashSize?: number; // sash width in pixels
  className?: string;
  onResize?: (size: number) => void;
  collapsed?: 'first' | 'second' | null;
  onCollapse?: (pane: 'first' | 'second' | null) => void;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  children,
  direction = 'horizontal',
  defaultSize = 50,
  minSize = 10,
  maxSize = 90,
  sashSize = 4,
  className = '',
  onResize,
  collapsed = null,
  onCollapse,
}) => {
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);

  const isHorizontal = direction === 'horizontal';

  // Handle mouse down on sash
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = isHorizontal ? e.clientX : e.clientY;
    startSizeRef.current = size;
  }, [isHorizontal, size]);

  // Handle double click to collapse/expand
  const handleDoubleClick = useCallback(() => {
    if (onCollapse) {
      if (collapsed) {
        onCollapse(null);
      } else {
        // Collapse to the side that has less space
        onCollapse(size < 50 ? 'first' : 'second');
      }
    }
  }, [collapsed, onCollapse, size]);

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const totalSize = isHorizontal ? rect.width : rect.height;
      const currentPos = isHorizontal ? e.clientX : e.clientY;
      const startPos = isHorizontal ? rect.left : rect.top;
      
      // Calculate new size as percentage
      const newSizePixels = currentPos - startPos;
      let newSize = (newSizePixels / totalSize) * 100;
      
      // Clamp to min/max
      newSize = Math.max(minSize, Math.min(maxSize, newSize));
      
      setSize(newSize);
      onResize?.(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isHorizontal, minSize, maxSize, onResize]);

  // Apply cursor style to body during drag
  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isHorizontal]);

  // Calculate actual sizes based on collapse state
  const getActualSizes = () => {
    if (collapsed === 'first') {
      return { first: 0, second: 100 };
    }
    if (collapsed === 'second') {
      return { first: 100, second: 0 };
    }
    return { first: size, second: 100 - size };
  };

  const actualSizes = getActualSizes();

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  };

  const firstPaneStyle: React.CSSProperties = {
    [isHorizontal ? 'width' : 'height']: collapsed === 'first' ? 0 : `calc(${actualSizes.first}% - ${sashSize / 2}px)`,
    overflow: 'hidden',
    transition: collapsed !== null ? 'all 0.2s ease' : undefined,
  };

  const secondPaneStyle: React.CSSProperties = {
    [isHorizontal ? 'width' : 'height']: collapsed === 'second' ? 0 : `calc(${actualSizes.second}% - ${sashSize / 2}px)`,
    overflow: 'hidden',
    transition: collapsed !== null ? 'all 0.2s ease' : undefined,
  };

  const sashStyle: React.CSSProperties = {
    [isHorizontal ? 'width' : 'height']: `${sashSize}px`,
    [isHorizontal ? 'minWidth' : 'minHeight']: `${sashSize}px`,
    cursor: isHorizontal ? 'col-resize' : 'row-resize',
    position: 'relative',
    zIndex: 10,
    flexShrink: 0,
  };

  return (
    <div ref={containerRef} style={containerStyle} className={className}>
      {/* First Pane */}
      <div style={firstPaneStyle} className="flex flex-col">
        {children[0]}
      </div>

      {/* Sash / Divider */}
      <div
        style={sashStyle}
        className={`group flex items-center justify-center ${isDragging ? 'bg-vscode-accent' : ''}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Sash indicator */}
        <div
          className={`
            ${isHorizontal ? 'w-[2px] h-full' : 'w-full h-[2px]'}
            transition-all duration-150
            ${isDragging 
              ? 'bg-vscode-accent' 
              : isHovering 
                ? 'bg-vscode-accent/80' 
                : 'bg-vscode-border/50 group-hover:bg-vscode-border'
            }
          `}
        />
        
        {/* Drag handle dots */}
        {(isHovering || isDragging) && (
          <div 
            className={`
              absolute flex ${isHorizontal ? 'flex-col' : 'flex-row'} gap-0.5
              ${isHorizontal ? 'py-2' : 'px-2'}
            `}
          >
            {[0, 1, 2].map(i => (
              <div 
                key={i}
                className={`
                  w-1 h-1 rounded-full
                  ${isDragging ? 'bg-white' : 'bg-vscode-accent'}
                `}
              />
            ))}
          </div>
        )}
      </div>

      {/* Second Pane */}
      <div style={secondPaneStyle} className="flex flex-col">
        {children[1]}
      </div>
    </div>
  );
};

// Multi-pane split (for more than 2 panes)
interface MultiSplitPaneProps {
  children: React.ReactNode[];
  direction?: SplitDirection;
  defaultSizes?: number[]; // percentages
  minSizes?: number[];
  sashSize?: number;
  className?: string;
}

export const MultiSplitPane: React.FC<MultiSplitPaneProps> = ({
  children,
  direction = 'horizontal',
  defaultSizes,
  minSizes,
  sashSize = 4,
  className = '',
}) => {
  const childArray = React.Children.toArray(children);
  const count = childArray.length;
  
  // Initialize sizes
  const initialSizes = defaultSizes || childArray.map(() => 100 / count);
  const [sizes, setSizes] = useState<number[]>(initialSizes);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const isHorizontal = direction === 'horizontal';

  const handleMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingIndex(index);
  }, []);

  useEffect(() => {
    if (draggingIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const totalSize = isHorizontal ? rect.width : rect.height;
      const currentPos = isHorizontal ? e.clientX - rect.left : e.clientY - rect.top;
      
      // Calculate position as percentage
      const posPercent = (currentPos / totalSize) * 100;
      
      // Calculate how much space is before this sash
      let beforeSize = 0;
      for (let i = 0; i < draggingIndex; i++) {
        beforeSize += sizes[i];
      }
      
      // Calculate new sizes for the two adjacent panes
      const newSizes = [...sizes];
      const minSize = minSizes?.[draggingIndex] || 10;
      const minSizeNext = minSizes?.[draggingIndex + 1] || 10;
      
      const totalBothPanes = sizes[draggingIndex] + sizes[draggingIndex + 1];
      let newFirstSize = posPercent - beforeSize;
      
      // Clamp
      newFirstSize = Math.max(minSize, Math.min(totalBothPanes - minSizeNext, newFirstSize));
      
      newSizes[draggingIndex] = newFirstSize;
      newSizes[draggingIndex + 1] = totalBothPanes - newFirstSize;
      
      setSizes(newSizes);
    };

    const handleMouseUp = () => {
      setDraggingIndex(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingIndex, isHorizontal, sizes, minSizes]);

  useEffect(() => {
    if (draggingIndex !== null) {
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [draggingIndex, isHorizontal]);

  return (
    <div 
      ref={containerRef}
      className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} w-full h-full overflow-hidden ${className}`}
    >
      {childArray.map((child, index) => (
        <React.Fragment key={index}>
          <div 
            style={{ 
              [isHorizontal ? 'width' : 'height']: `calc(${sizes[index]}% - ${(sashSize * (count - 1)) / count}px)`,
            }}
            className="overflow-hidden flex flex-col"
          >
            {child}
          </div>
          
          {index < count - 1 && (
            <Sash
              direction={direction}
              size={sashSize}
              isDragging={draggingIndex === index}
              onMouseDown={(e) => handleMouseDown(index, e)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Standalone Sash component for edge resizing
interface SashProps {
  direction?: SplitDirection;
  position?: 'start' | 'end'; // 'start' = left/top edge, 'end' = right/bottom edge
  size?: number;
  isDragging?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  onResize?: (delta: number) => void; // delta in pixels
  className?: string;
}

export const Sash: React.FC<SashProps> = ({
  direction = 'vertical',
  position = 'end',
  size = 4,
  isDragging: externalDragging,
  onMouseDown: externalMouseDown,
  onDoubleClick,
  onResize,
  className = '',
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [internalDragging, setInternalDragging] = useState(false);
  const startPosRef = useRef(0);
  const isHorizontal = direction === 'horizontal';
  const isDragging = externalDragging ?? internalDragging;

  // Handle mouse down for standalone resize functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (externalMouseDown) {
      externalMouseDown(e);
      return;
    }
    
    if (onResize) {
      e.preventDefault();
      setInternalDragging(true);
      startPosRef.current = isHorizontal ? e.clientY : e.clientX;
    }
  }, [externalMouseDown, onResize, isHorizontal]);

  // Handle mouse move during drag
  useEffect(() => {
    if (!internalDragging || !onResize) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = isHorizontal ? e.clientY : e.clientX;
      const delta = currentPos - startPosRef.current;
      onResize(delta);
      startPosRef.current = currentPos;
    };

    const handleMouseUp = () => {
      setInternalDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [internalDragging, onResize, isHorizontal]);

  // Position styles for edge sashes
  const positionStyles: React.CSSProperties = onResize ? (position === 'start'
    ? { position: 'absolute', [isHorizontal ? 'top' : 'left']: 0, [isHorizontal ? 'left' : 'top']: 0, [isHorizontal ? 'right' : 'bottom']: 0 }
    : { position: 'absolute', [isHorizontal ? 'bottom' : 'right']: 0, [isHorizontal ? 'left' : 'top']: 0, [isHorizontal ? 'right' : 'bottom']: 0 }) : {};

  return (
    <div
      className={`
        group flex items-center justify-center flex-shrink-0
        ${isHorizontal ? 'cursor-row-resize' : 'cursor-col-resize'}
        ${isDragging ? 'bg-indigo-500/10' : ''}
        ${className}
      `}
      style={{
        ...positionStyles,
        [isHorizontal ? 'height' : 'width']: `${size}px`,
        [isHorizontal ? 'minHeight' : 'minWidth']: `${size}px`,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Line indicator */}
      <div
        className={`
          ${isHorizontal ? 'h-px w-full' : 'w-px h-full'}
          transition-all duration-100
          ${isDragging 
            ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
            : isHovering 
              ? 'bg-indigo-400' 
              : 'bg-slate-600/30 dark:bg-slate-500/30'
          }
        `}
      />
      
      {/* Hover expand area for easier grabbing */}
      <div
        className={`
          absolute ${isHorizontal ? 'h-3 w-full' : 'w-3 h-full'}
          ${isHorizontal ? '-top-1' : '-left-1'}
        `}
      />
    </div>
  );
};

// ResizablePanel - A panel with a sash on one side
interface ResizablePanelProps {
  children: React.ReactNode;
  side: 'left' | 'right' | 'top' | 'bottom';
  defaultSize?: number; // pixels
  minSize?: number;
  maxSize?: number;
  sashSize?: number;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  onResize?: (size: number) => void;
  className?: string;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  side,
  defaultSize = 256,
  minSize = 150,
  maxSize = 600,
  sashSize = 4,
  collapsed = false,
  onCollapse,
  onResize,
  className = '',
}) => {
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);

  const isHorizontal = side === 'left' || side === 'right';
  const isReverse = side === 'right' || side === 'bottom';

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = isHorizontal ? e.clientX : e.clientY;
    startSizeRef.current = size;
  }, [isHorizontal, size]);

  const handleDoubleClick = useCallback(() => {
    onCollapse?.(!collapsed);
  }, [collapsed, onCollapse]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = isHorizontal ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;
      const adjustedDelta = isReverse ? -delta : delta;
      
      let newSize = startSizeRef.current + adjustedDelta;
      newSize = Math.max(minSize, Math.min(maxSize, newSize));
      
      setSize(newSize);
      onResize?.(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isHorizontal, isReverse, minSize, maxSize, onResize]);

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isHorizontal]);

  const actualSize = collapsed ? 0 : size;

  const panelStyle: React.CSSProperties = {
    [isHorizontal ? 'width' : 'height']: actualSize,
    [isHorizontal ? 'minWidth' : 'minHeight']: collapsed ? 0 : minSize,
    transition: collapsed !== undefined ? 'all 0.2s ease' : undefined,
    overflow: 'hidden',
  };

  const flexDirection = isReverse 
    ? (isHorizontal ? 'flex-row-reverse' : 'flex-col-reverse')
    : (isHorizontal ? 'flex-row' : 'flex-col');

  return (
    <div 
      ref={containerRef}
      className={`flex ${flexDirection} ${className}`}
    >
      <div style={panelStyle} className="flex flex-col overflow-hidden">
        {children}
      </div>
      
      {!collapsed && (
        <Sash
          direction={isHorizontal ? 'horizontal' : 'vertical'}
          size={sashSize}
          isDragging={isDragging}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        />
      )}
    </div>
  );
};

export default SplitPane;
