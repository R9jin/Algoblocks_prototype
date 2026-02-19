// src/components/BlocklyWorkspace.jsx
import "blockly/blocks";
import * as Blockly from "blockly/core";
import * as En from "blockly/msg/en";
import { pythonGenerator } from "blockly/python";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"; // <--- IMPORT forwardRef & useImperativeHandle

// --- PLUGIN IMPORTS ---
import { CrossTabCopyPaste } from "@blockly/plugin-cross-tab-copy-paste";
import { Modal } from "@blockly/plugin-modal";
import { WorkspaceSearch } from "@blockly/plugin-workspace-search";
import { PositionedMinimap } from "@blockly/workspace-minimap";
import { ZoomToFitControl } from "@blockly/zoom-to-fit";

Blockly.setLocale(En);

// --- 1. DEFINE CUSTOM BLOCKS ---
const customBlocks = [
  // Comment Block
  {
    "type": "comment_block",
    "message0": "Comment %1",
    "args0": [
      { "type": "field_input", "name": "TEXT", "text": "write note here" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#999999",
    "tooltip": "Adds a comment to the Python code",
    "helpUrl": ""
  },
  // Math Assignment (+=, -=, *=, /=)
  {
    "type": "math_assignment",
    "message0": "%1 %2 %3",
    "args0": [
      {
        "type": "field_variable",
        "name": "VAR",
        "variable": "item"
      },
      {
        "type": "field_dropdown",
        "name": "OP",
        "options": [
          ["+=", "ADD"],
          ["-=", "MINUS"],
          ["*=", "MULTIPLY"],
          ["/=", "DIVIDE"]
        ]
      },
      {
        "type": "input_value",
        "name": "DELTA",
        "check": "Number"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "Modify a variable (Add, Subtract, Multiply, Divide).",
    "helpUrl": ""
  }
];

if (Blockly.common && Blockly.common.defineBlocksWithJsonArray) {
  Blockly.common.defineBlocksWithJsonArray(customBlocks);
} else {
  Blockly.defineBlocksWithJsonArray(customBlocks);
}

// --- TOOLBOX CONFIGURATION ---
const toolbox = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Logic",
      colour: "210",
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" },
        { kind: "block", type: "logic_null" },
        { kind: "block", type: "logic_ternary" },
      ],
    },
    {
      kind: "category",
      name: "Loops",
      colour: "120",
      contents: [
        { kind: "block", type: "controls_repeat_ext", inputs: { TIMES: { shadow: { type: "math_number", fields: { NUM: 10 } } } } },
        { kind: "block", type: "controls_whileUntil" },
        { kind: "block", type: "controls_for", inputs: { FROM: { shadow: { type: "math_number", fields: { NUM: 1 } } }, TO: { shadow: { type: "math_number", fields: { NUM: 10 } } }, BY: { shadow: { type: "math_number", fields: { NUM: 1 } } } } },
        { kind: "block", type: "controls_forEach" },
        { kind: "block", type: "controls_flow_statements" },
      ],
    },
    {
      kind: "category",
      name: "Math",
      colour: "230",
      contents: [
        { kind: "block", type: "math_number", fields: { NUM: 123 } },
        { kind: "block", type: "math_arithmetic", inputs: { A: { shadow: { type: "math_number", fields: { NUM: 1 } } }, B: { shadow: { type: "math_number", fields: { NUM: 1 } } } } },
        { kind: "block", type: "math_assignment" }, 
        { kind: "block", type: "math_single" },
        { kind: "block", type: "math_trig" },
        { kind: "block", type: "math_constant" },
        { kind: "block", type: "math_number_property" },
        { kind: "block", type: "math_round" },
        { kind: "block", type: "math_on_list" },
        { kind: "block", type: "math_modulo" },
        { kind: "block", type: "math_constrain", inputs: { LOW: { shadow: { type: "math_number", fields: { NUM: 1 } } }, HIGH: { shadow: { type: "math_number", fields: { NUM: 100 } } } } },
        { kind: "block", type: "math_random_int", inputs: { FROM: { shadow: { type: "math_number", fields: { NUM: 1 } } }, TO: { shadow: { type: "math_number", fields: { NUM: 100 } } } } },
        { kind: "block", type: "math_random_float" },
      ],
    },
    {
      kind: "category",
      name: "Text",
      colour: "160",
      contents: [
        { kind: "block", type: "comment_block" }, 
        { kind: "block", type: "text" },
        { kind: "block", type: "text_join" },
        { kind: "block", type: "text_append" },
        { kind: "block", type: "text_length" },
        { kind: "block", type: "text_isEmpty" },
        { kind: "block", type: "text_indexOf" },
        { kind: "block", type: "text_charAt" },
        { kind: "block", type: "text_getSubstring" },
        { kind: "block", type: "text_changeCase" },
        { kind: "block", type: "text_trim" },
        { kind: "block", type: "text_print" },
        { kind: "block", type: "text_prompt_ext", inputs: { TEXT: { shadow: { type: "text", fields: { TEXT: "abc" } } } } },
      ],
    },
    {
      kind: "category",
      name: "Lists",
      colour: "260",
      contents: [
        { kind: "block", type: "lists_create_with", extraState: { itemCount: 0 } },
        { kind: "block", type: "lists_create_with" },
        { kind: "block", type: "lists_repeat", inputs: { NUM: { shadow: { type: "math_number", fields: { NUM: 5 } } } } },
        { kind: "block", type: "lists_length" },
        { kind: "block", type: "lists_isEmpty" },
        { kind: "block", type: "lists_indexOf" },
        { kind: "block", type: "lists_getIndex" },
        { kind: "block", type: "lists_setIndex" },
        { kind: "block", type: "lists_getSublist" },
        { kind: "block", type: "lists_split" },
        { kind: "block", type: "lists_sort" },
      ],
    },
    { kind: "sep" },
    { kind: "category", name: "Variables", colour: "330", custom: "VARIABLE" },
    { kind: "category", name: "Functions", colour: "290", custom: "PROCEDURE" },
  ],
};

// --- WRAP COMPONENT IN forwardRef ---
const BlocklyWorkspace = forwardRef(({ onChange }, ref) => {
  const blocklyDiv = useRef(null);
  const workspace = useRef(null);
  const onChangeRef = useRef(onChange);

  // --- EXPOSE CLEAR FUNCTION ---
  useImperativeHandle(ref, () => ({
    clear: () => {
      if (workspace.current) {
        workspace.current.clear();
      }
    }
  }));

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (workspace.current) return;

    if (blocklyDiv.current) {
      workspace.current = Blockly.inject(blocklyDiv.current, {
        toolbox: toolbox,
        trashcan: true,
        move: { scrollbars: true, drag: true, wheel: true },
        zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
        renderer: "geras", 
      });

      const workspaceSearch = new WorkspaceSearch(workspace.current);
      workspaceSearch.init();
      const zoomToFit = new ZoomToFitControl(workspace.current);
      zoomToFit.init();
      if (!Blockly.ContextMenuRegistry.registry.getItem('blockCopyToStorage')) {
        const crossTab = new CrossTabCopyPaste();
        crossTab.init({ contextMenu: true, shortcut: true }, () => {});
      }
      const minimap = new PositionedMinimap(workspace.current);
      minimap.init();
      const modal = new Modal(workspace.current);
      modal.init();

      // --- GENERATORS ---
      
      pythonGenerator.forBlock['comment_block'] = function(block) {
        const text = block.getFieldValue('TEXT');
        return `# ${text}\n`;
      };

      // Math Assignment
      pythonGenerator.forBlock['math_assignment'] = function(block) {
        const variable = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
        const operator = block.getFieldValue('OP');
        const value = pythonGenerator.valueToCode(block, 'DELTA', pythonGenerator.ORDER_ADDITIVE) || '0';

        let symbol = "+=";
        if (operator === "MINUS") symbol = "-=";
        else if (operator === "MULTIPLY") symbol = "*=";
        else if (operator === "DIVIDE") symbol = "/=";

        return `${variable} ${symbol} ${value}\n`;
      };

      // Loop Fix (range(n))
      pythonGenerator.forBlock['controls_for'] = function(block) {
        const variable = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
        const from = pythonGenerator.valueToCode(block, 'FROM', pythonGenerator.ORDER_NONE) || '0';
        const to = pythonGenerator.valueToCode(block, 'TO', pythonGenerator.ORDER_ADDITIVE) || '0';
        const step = pythonGenerator.valueToCode(block, 'BY', pythonGenerator.ORDER_NONE) || '1';

        let rangeCode;
        if (step === '1') {
            if (from === '0') {
                rangeCode = `range(${to})`; 
            } else {
                rangeCode = `range(${from}, ${to})`; 
            }
        } else {
            rangeCode = `range(${from}, ${to}, ${step})`;
        }

        let branch = pythonGenerator.statementToCode(block, 'DO') || pythonGenerator.PASS;
        return `for ${variable} in ${rangeCode}:\n${branch}`;
      };

      // Clean List Get
      pythonGenerator.forBlock['lists_getIndex'] = function(block) {
        const mode = block.getFieldValue('MODE') || 'GET';
        const where = block.getFieldValue('WHERE') || 'FROM_START';
        const list = pythonGenerator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_MEMBER) || '[]';
        if (where === 'FROM_START') {
            const at = pythonGenerator.valueToCode(block, 'AT', pythonGenerator.ORDER_NONE) || '0';
            if (mode === 'GET') return [`${list}[${at}]`, pythonGenerator.ORDER_MEMBER];
            else if (mode === 'REMOVE') return `${list}.pop(${at})\n`;
        }
        return [`${list}[0]`, pythonGenerator.ORDER_MEMBER]; 
      };

      // Clean List Set
      pythonGenerator.forBlock['lists_setIndex'] = function(block) {
        const list = pythonGenerator.valueToCode(block, 'LIST', pythonGenerator.ORDER_MEMBER) || 'list';
        const mode = block.getFieldValue('MODE') || 'SET';
        const where = block.getFieldValue('WHERE') || 'FROM_START';
        const value = pythonGenerator.valueToCode(block, 'TO', pythonGenerator.ORDER_NONE) || 'None';
        if (where === 'FROM_START') {
            const at = pythonGenerator.valueToCode(block, 'AT', pythonGenerator.ORDER_NONE) || '0';
            if (mode === 'SET') return `${list}[${at}] = ${value}\n`;
            else if (mode === 'INSERT') return `${list}.insert(${at}, ${value})\n`;
        }
        return `${list}[0] = ${value}\n`;
      };

      pythonGenerator.finish = function(code) {
        const definitions = Object.values(pythonGenerator.definitions_);
        
        const imports = [];
        const funcs = [];

        definitions.forEach(def => {
            if (def.includes('import')) {
                imports.push(def);
            } else if (def.trim().startsWith('def ')) { 
                // ONLY keep functions (lines starting with 'def')
                // This explicitly ignores 'swapped = None' or 'i = None'
                funcs.push(def);
            }
        });

        // Clear the definitions so they don't duplicate on next run
        pythonGenerator.definitions_ = Object.create(null);
        pythonGenerator.functionNames_ = Object.create(null);

        // Combine: Imports -> Functions -> Code (No Variables)
        const allDefs = imports.join('\n') + '\n\n' + funcs.join('\n\n');
        return allDefs.replace(/\n\n+/g, '\n\n').trim() + '\n\n' + code;
      };

      // Procedure Generator
      const procedureGenerator = function(block) {
        const funcName = pythonGenerator.getProcedureName(block.getFieldValue('NAME'));
        let branch = pythonGenerator.statementToCode(block, 'STACK');
        let returnValue = '';
        if (block.type === 'procedures_defreturn') {
            returnValue = pythonGenerator.valueToCode(block, 'RETURN', pythonGenerator.ORDER_NONE) || '';
            if (returnValue) returnValue = pythonGenerator.INDENT + 'return ' + returnValue + '\n';
        }
        const args = [];
        const variables = block.getVars();
        for (let i = 0; i < variables.length; i++) {
            args[i] = pythonGenerator.getVariableName(variables[i]);
        }
        if (!branch && !returnValue) branch = pythonGenerator.PASS;
        return 'def ' + funcName + '(' + args.join(', ') + '):\n' + branch + returnValue;
      };

      pythonGenerator.forBlock['procedures_defnoreturn'] = procedureGenerator;
      pythonGenerator.forBlock['procedures_defreturn'] = procedureGenerator;

      workspace.current.addChangeListener((event) => {
        if (event.type === Blockly.Events.BLOCK_CREATE || event.type === Blockly.Events.BLOCK_DELETE || event.type === Blockly.Events.BLOCK_CHANGE || event.type === Blockly.Events.BLOCK_MOVE) {
          const json = Blockly.serialization.workspaces.save(workspace.current);
          const code = pythonGenerator.workspaceToCode(workspace.current);
          if (onChangeRef.current) onChangeRef.current(json, code);
        }
      });
      
      const observer = new ResizeObserver(() => {
        if (workspace.current) Blockly.svgResize(workspace.current);
      });
      observer.observe(blocklyDiv.current);
      blocklyDiv.current.resizeObserver = observer;
    }

    return () => {
      if (workspace.current) {
        workspace.current.dispose(); 
        workspace.current = null;    
      }
      if (blocklyDiv.current && blocklyDiv.current.resizeObserver) {
        blocklyDiv.current.resizeObserver.disconnect();
      }
    };
  }, []); 

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={blocklyDiv} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}); // <--- END FORWARD REF

export default BlocklyWorkspace;