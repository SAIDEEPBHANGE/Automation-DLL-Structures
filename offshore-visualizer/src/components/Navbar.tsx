import React, { useState, useRef, useEffect } from 'react';

export interface SearchOption {
  id: string;
  label: string;
}

interface NavbarProps {
  currentSuite: 'SmartPlant3D' | 'SmartPlantPID';
  onSuiteChange: (suite: 'SmartPlant3D' | 'SmartPlantPID') => void;
  options: SearchOption[];
  onSelectNode: (nodeId: string) => void;
  stats?: {
    nodesCount: number;
    edgesCount: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSuite,
  onSuiteChange,
  options,
  onSelectNode,
  stats
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Filter options based on user typing (matches label or numeric ID)
  const filteredOptions = query.trim() === ''
    ? []
    : options
        .filter(
          (opt) =>
            opt.label.toLowerCase().includes(query.toLowerCase()) ||
            opt.id.includes(query.trim())
        )
        .slice(0, 12);

  // Close dropdown menu if user clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 100,
        color: '#f8fafc',
        boxSizing: 'border-box'
      }}
    >
      {/* Left: Title & Live Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>Off-Shore</span>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400 }}>
            Architecture Auditor
          </span>
        </h1>

        {stats && (
          <div
            style={{
              display: 'flex',
              gap: '10px',
              fontSize: '12px',
              color: '#64748b',
              borderLeft: '1px solid #334155',
              paddingLeft: '16px'
            }}
          >
            <span>
              <strong style={{ color: '#cbd5e1' }}>{stats.nodesCount.toLocaleString()}</strong> DLLs
            </span>
            <span>•</span>
            <span>
              <strong style={{ color: '#cbd5e1' }}>{stats.edgesCount.toLocaleString()}</strong> Edges
            </span>
          </div>
        )}
      </div>

      {/* Right: Suite Selector & Search Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Suite Dropdown */}
        <select
          value={currentSuite}
          onChange={(e) => onSuiteChange(e.target.value as 'SmartPlant3D' | 'SmartPlantPID')}
          style={{
            padding: '8px 12px',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #475569',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="SmartPlant3D">SmartPlant 3D</option>
          <option value="SmartPlantPID">SmartPlant P&ID</option>
        </select>

        {/* Search Bar with Autocomplete Dropdown */}
        <div ref={containerRef} style={{ position: 'relative', width: '320px' }}>
          <input
            type="text"
            placeholder="Search DLL by name or ID..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            style={{
              width: '100%',
              padding: '8px 14px',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />

          {isOpen && filteredOptions.length > 0 && (
            <ul
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                margin: 0,
                padding: '4px 0',
                listStyle: 'none',
                maxHeight: '280px',
                overflowY: 'auto',
                zIndex: 200
              }}
            >
              {filteredOptions.map((opt) => (
                <li
                  key={opt.id}
                  onClick={() => {
                    onSelectNode(opt.id);
                    setQuery(opt.label);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #283548'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ fontWeight: 500 }}>{opt.label}</span>
                  <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>
                    #{opt.id}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  );
};