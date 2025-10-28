import { createSignal } from 'solid-js';
import { IconX } from '@tabler/icons-solidjs';

export default function AdvancedTextDialog(props) {
  const [text, setText] = createSignal(props.initialConfig?.text || "Hello Stream!");
  const [fontSize, setFontSize] = createSignal(props.initialConfig?.fontSize || 48);
  const [fontFamily, setFontFamily] = createSignal(props.initialConfig?.fontFamily || "Arial");
  const [color, setColor] = createSignal(props.initialConfig?.color || '#ffffff');
  const [backgroundColor, setBackgroundColor] = createSignal(props.initialConfig?.backgroundColor || "transparent");
  const [textAlign, setTextAlign] = createSignal(props.initialConfig?.textAlign || "left");
  const [bold, setBold] = createSignal(props.initialConfig?.bold || false);
  const [italic, setItalic] = createSignal(props.initialConfig?.italic || false);
  const [underline, setUnderline] = createSignal(props.initialConfig?.underline || false);

  // Stroke/Outline
  const [strokeEnabled, setStrokeEnabled] = createSignal(props.initialConfig?.strokeEnabled || false);
  const [strokeColor, setStrokeColor] = createSignal(props.initialConfig?.strokeColor || '#000000');
  const [strokeWidth, setStrokeWidth] = createSignal(props.initialConfig?.strokeWidth || 2);

  // Shadow
  const [shadowEnabled, setShadowEnabled] = createSignal(props.initialConfig?.shadowEnabled || false);
  const [shadowColor, setShadowColor] = createSignal(props.initialConfig?.shadowColor || '#000000');
  const [shadowBlur, setShadowBlur] = createSignal(props.initialConfig?.shadowBlur || 4);
  const [shadowOffsetX, setShadowOffsetX] = createSignal(props.initialConfig?.shadowOffsetX || 2);
  const [shadowOffsetY, setShadowOffsetY] = createSignal(props.initialConfig?.shadowOffsetY || 2);

  // Gradient
  const [gradientEnabled, setGradientEnabled] = createSignal(props.initialConfig?.gradientEnabled || false);
  const [gradientColor1, setGradientColor1] = createSignal(props.initialConfig?.gradientColor1 || '#ff0000');
  const [gradientColor2, setGradientColor2] = createSignal(props.initialConfig?.gradientColor2 || '#0000ff');
  const [gradientDirection, setGradientDirection] = createSignal(props.initialConfig?.gradientDirection || "vertical");

  const handleConfirm = () => {
    props.onConfirm({
      text: text(),
      fontSize: fontSize(),
      fontFamily: fontFamily(),
      color: color(),
      backgroundColor: backgroundColor(),
      textAlign: textAlign(),
      bold: bold(),
      italic: italic(),
      underline: underline(),
      strokeEnabled: strokeEnabled(),
      strokeColor: strokeColor(),
      strokeWidth: strokeWidth(),
      shadowEnabled: shadowEnabled(),
      shadowColor: shadowColor(),
      shadowBlur: shadowBlur(),
      shadowOffsetX: shadowOffsetX(),
      shadowOffsetY: shadowOffsetY(),
      gradientEnabled: gradientEnabled(),
      gradientColor1: gradientColor1(),
      gradientColor2: gradientColor2(),
      gradientDirection: gradientDirection()
    });
  };

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto" onClick={props.onCancel}>
      <div class="card bg-base-100 w-full max-w-2xl m-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="card-title text-2xl">Advanced Text Styling</h3>
            <button class="btn btn-ghost btn-sm btn-circle" onClick={props.onCancel}>
              <IconX size={20} />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-4">
            {/* Text Content */}
            <div class="form-control col-span-2">
              <label class="label">
                <span class="label-text font-semibold">Text Content</span>
              </label>
              <textarea
                class="textarea textarea-bordered"
                value={text()}
                onInput={(e) => setText(e.target.value)}
                rows={3}
              />
            </div>

            {/* Font Settings */}
            <div class="form-control">
              <label class="label">
                <span class="label-text">Font Family</span>
              </label>
              <select class="select select-bordered" value={fontFamily()} onChange={(e) => setFontFamily(e.target.value)}>
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
                <option value="Impact">Impact</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Font Size</span>
              </label>
              <input
                type="number"
                class="input input-bordered"
                value={fontSize()}
                onInput={(e) => setFontSize(parseInt(e.target.value))}
                min="12"
                max="300"
              />
            </div>

            {/* Text Style */}
            <div class="form-control col-span-2">
              <label class="label">
                <span class="label-text">Text Style</span>
              </label>
              <div class="flex gap-2">
                <label class="label cursor-pointer gap-2 flex-1 border rounded p-2">
                  <input type="checkbox" class="checkbox" checked={bold()} onChange={(e) => setBold(e.target.checked)} />
                  <span class="label-text font-bold">Bold</span>
                </label>
                <label class="label cursor-pointer gap-2 flex-1 border rounded p-2">
                  <input type="checkbox" class="checkbox" checked={italic()} onChange={(e) => setItalic(e.target.checked)} />
                  <span class="label-text italic">Italic</span>
                </label>
                <label class="label cursor-pointer gap-2 flex-1 border rounded p-2">
                  <input type="checkbox" class="checkbox" checked={underline()} onChange={(e) => setUnderline(e.target.checked)} />
                  <span class="label-text underline">Underline</span>
                </label>
              </div>
            </div>

            {/* Text Alignment */}
            <div class="form-control">
              <label class="label">
                <span class="label-text">Text Alignment</span>
              </label>
              <select class="select select-bordered" value={textAlign()} onChange={(e) => setTextAlign(e.target.value)}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            {/* Colors */}
            <div class="form-control">
              <label class="label">
                <span class="label-text">Text Color</span>
              </label>
              <input
                type="color"
                class="input input-bordered h-12"
                value={color()}
                onInput={(e) => setColor(e.target.value)}
              />
            </div>

            <div class="form-control col-span-2">
              <label class="label">
                <span class="label-text">Background Color</span>
              </label>
              <div class="flex gap-2">
                <input
                  type="color"
                  class="input input-bordered h-12 flex-1"
                  value={backgroundColor() === "transparent" ? "#000000" : backgroundColor()}
                  onInput={(e) => setBackgroundColor(e.target.value)}
                  disabled={backgroundColor() === "transparent"}
                />
                <label class="label cursor-pointer gap-2 border rounded px-4">
                  <input
                    type="checkbox"
                    class="checkbox"
                    checked={backgroundColor() === "transparent"}
                    onChange={(e) => setBackgroundColor(e.target.checked ? "transparent" : "#000000")}
                  />
                  <span class="label-text">Transparent</span>
                </label>
              </div>
            </div>

            {/* Stroke/Outline */}
            <div class="divider col-span-2">Stroke/Outline</div>
            <div class="form-control col-span-2">
              <label class="label cursor-pointer">
                <span class="label-text">Enable Text Outline</span>
                <input type="checkbox" class="toggle" checked={strokeEnabled()} onChange={(e) => setStrokeEnabled(e.target.checked)} />
              </label>
            </div>

            {strokeEnabled() && (
              <>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Outline Color</span>
                  </label>
                  <input
                    type="color"
                    class="input input-bordered h-12"
                    value={strokeColor()}
                    onInput={(e) => setStrokeColor(e.target.value)}
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Outline Width</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={strokeWidth()}
                    onInput={(e) => setStrokeWidth(parseInt(e.target.value))}
                    class="range"
                  />
                  <span class="text-sm text-center">{strokeWidth()}px</span>
                </div>
              </>
            )}

            {/* Shadow */}
            <div class="divider col-span-2">Shadow</div>
            <div class="form-control col-span-2">
              <label class="label cursor-pointer">
                <span class="label-text">Enable Text Shadow</span>
                <input type="checkbox" class="toggle" checked={shadowEnabled()} onChange={(e) => setShadowEnabled(e.target.checked)} />
              </label>
            </div>

            {shadowEnabled() && (
              <>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Shadow Color</span>
                  </label>
                  <input
                    type="color"
                    class="input input-bordered h-12"
                    value={shadowColor()}
                    onInput={(e) => setShadowColor(e.target.value)}
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Shadow Blur</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={shadowBlur()}
                    onInput={(e) => setShadowBlur(parseInt(e.target.value))}
                    class="range"
                  />
                  <span class="text-sm text-center">{shadowBlur()}px</span>
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Shadow Offset X</span>
                  </label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={shadowOffsetX()}
                    onInput={(e) => setShadowOffsetX(parseInt(e.target.value))}
                    class="range"
                  />
                  <span class="text-sm text-center">{shadowOffsetX()}px</span>
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Shadow Offset Y</span>
                  </label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={shadowOffsetY()}
                    onInput={(e) => setShadowOffsetY(parseInt(e.target.value))}
                    class="range"
                  />
                  <span class="text-sm text-center">{shadowOffsetY()}px</span>
                </div>
              </>
            )}

            {/* Gradient */}
            <div class="divider col-span-2">Gradient</div>
            <div class="form-control col-span-2">
              <label class="label cursor-pointer">
                <span class="label-text">Enable Text Gradient</span>
                <input type="checkbox" class="toggle" checked={gradientEnabled()} onChange={(e) => setGradientEnabled(e.target.checked)} />
              </label>
            </div>

            {gradientEnabled() && (
              <>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Gradient Color 1</span>
                  </label>
                  <input
                    type="color"
                    class="input input-bordered h-12"
                    value={gradientColor1()}
                    onInput={(e) => setGradientColor1(e.target.value)}
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Gradient Color 2</span>
                  </label>
                  <input
                    type="color"
                    class="input input-bordered h-12"
                    value={gradientColor2()}
                    onInput={(e) => setGradientColor2(e.target.value)}
                  />
                </div>
                <div class="form-control col-span-2">
                  <label class="label">
                    <span class="label-text">Gradient Direction</span>
                  </label>
                  <select class="select select-bordered" value={gradientDirection()} onChange={(e) => setGradientDirection(e.target.value)}>
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                    <option value="diagonal">Diagonal</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div class="card-actions justify-end mt-6">
            <button class="btn btn-ghost" onClick={props.onCancel}>
              Cancel
            </button>
            <button class="btn btn-primary" onClick={handleConfirm}>
              {props.isEdit ? 'Update' : 'Add'} Text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
