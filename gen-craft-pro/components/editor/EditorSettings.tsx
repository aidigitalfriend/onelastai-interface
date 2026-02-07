/**
 * EditorSettings — Theme, font size, keybindings settings panel
 * Beautiful glassmorphism modal with real-time preview
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Type, Palette, Keyboard, ToggleLeft, ToggleRight, RotateCcw } from 'lucide-react';
import Modal, { ModalButton } from '../shared/Modal';
import { useEditorSettingsStore, EditorSettings as EditorSettingsType } from '../../stores/editorStore';

interface EditorSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditorSettingsPanel: React.FC<EditorSettingsProps> = ({ isOpen, onClose }) => {
  const settings = useEditorSettingsStore((s) => s.settings);
  const updateSettings = useEditorSettingsStore((s) => s.updateSettings);
  const resetSettings = useEditorSettingsStore((s) => s.resetSettings);

  const Toggle: React.FC<{ label: string; description: string; value: boolean; onChange: (v: boolean) => void }> = ({
    label, description, value, onChange,
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0">
      <div>
        <p className="text-xs font-medium text-zinc-200">{label}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">{description}</p>
      </div>
      <button onClick={() => onChange(!value)} className="transition-colors">
        {value ? (
          <ToggleRight className="w-7 h-7 text-violet-400" />
        ) : (
          <ToggleLeft className="w-7 h-7 text-zinc-600" />
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editor Settings"
      subtitle="Customize your coding experience"
      icon={<Settings className="w-5 h-5" />}
      size="lg"
      footer={
        <>
          <ModalButton variant="ghost" onClick={() => { resetSettings(); }}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </ModalButton>
          <ModalButton variant="primary" onClick={onClose}>Done</ModalButton>
        </>
      }
    >
      <div className="space-y-6">
        {/* Font Settings */}
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Type className="w-3.5 h-3.5" /> Typography
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300">Font Size</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSettings({ fontSize: Math.max(10, settings.fontSize - 1) })}
                  className="w-7 h-7 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all text-xs font-bold"
                >
                  −
                </button>
                <span className="text-xs text-white font-mono w-8 text-center">{settings.fontSize}</span>
                <button
                  onClick={() => updateSettings({ fontSize: Math.min(28, settings.fontSize + 1) })}
                  className="w-7 h-7 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300">Tab Size</span>
              <div className="flex items-center gap-1">
                {[2, 4, 8].map((size) => (
                  <button
                    key={size}
                    onClick={() => updateSettings({ tabSize: size })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      settings.tabSize === size
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'bg-zinc-900/50 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300">Word Wrap</span>
              <div className="flex items-center gap-1">
                {['on', 'off'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateSettings({ wordWrap: mode as 'on' | 'off' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      settings.wordWrap === mode
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'bg-zinc-900/50 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Palette className="w-3.5 h-3.5" /> Display
          </h3>
          <div>
            <Toggle
              label="Minimap"
              description="Show code overview on the right side"
              value={settings.minimap}
              onChange={(v) => updateSettings({ minimap: v })}
            />
            <Toggle
              label="Bracket Pair Colorization"
              description="Color-code matching brackets"
              value={settings.bracketPairColorization}
              onChange={(v) => updateSettings({ bracketPairColorization: v })}
            />
            <Toggle
              label="Line Numbers"
              description="Show line numbers in the gutter"
              value={settings.lineNumbers === 'on'}
              onChange={(v) => updateSettings({ lineNumbers: v ? 'on' : 'off' })}
            />
          </div>
        </div>

        {/* Auto-save Settings */}
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Keyboard className="w-3.5 h-3.5" /> Behavior
          </h3>
          <div>
            <Toggle
              label="Auto Save"
              description="Automatically save changes after a delay"
              value={settings.autoSave}
              onChange={(v) => updateSettings({ autoSave: v })}
            />
            <Toggle
              label="Format on Save"
              description="Format code when saving"
              value={settings.formatOnSave}
              onChange={(v) => updateSettings({ formatOnSave: v })}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EditorSettingsPanel;
