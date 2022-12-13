import { useRef, useEffect } from "react";
import { useMonacoEditor } from "./useMonacoEditor";
import type EditorApi from "monaco-editor/esm/vs/editor/editor.api";
import { FunctionInfo } from "sqrl";
import { IDisposable } from "monaco-editor/esm/vs/editor/editor.api";

export type ChangeHandler = (
  value: string,
  event: EditorApi.editor.IModelContentChangedEvent
) => void;

export type FunctionInfoMap = {
  [name: string]: FunctionInfo;
};

export interface MonacoEditorProps {
  className?: string;
  onChange?: ChangeHandler;
  options?: EditorApi.editor.IStandaloneEditorConstructionOptions;
  theme?: string;
  value: string;
  style?: React.CSSProperties;
  markers?: Omit<EditorApi.editor.IMarkerData, "relatedInformation">[];
  sqrlFunctions: FunctionInfoMap | null;
}

function configureSqrlLanguage(
  monaco: typeof EditorApi,
  functions: FunctionInfoMap
) {
  const disposables: IDisposable[] = [];
  monaco.languages.register({
    id: "sqrl",
  });

  const keywords = [
    // definitions
    "let",
    // rules
    "create",
    "rule",
    "where",
    "with",
    "reason",
    "when",
    "then",
    // loops
    "for",
    "in",
    // counters
    "by",
    "total",
    "last",
    "hour",
    "day",
    "month",
  ];
  const builtin = ["input"];
  const functionNames = Object.keys(functions).sort();
  const functionsInfo = functionNames.map((f) => functions[f]);

  disposables.push(
    monaco.languages.setMonarchTokensProvider("sqrl", {
      ignoreCase: true,

      builtin,
      functions: functionNames,
      keywords,
      escapes: /\\/,

      operators: [
        "+",
        "-",
        "/",
        "*",
        "%",
        ":=",
        "=",
        "!=",
        ">",
        "<",
        ">=",
        "<=",
      ],
      boolean: ["true", "false"],
      symbols: /[=><!~:|+\-*\/%]+/,

      tokenizer: {
        root: [
          // identifiers
          [
            /[a-z]\w+/,
            {
              cases: {
                "@keywords": "keyword",
                "@boolean": "number",
                "@builtin": "type",
                "@functions": "key",
                "@default": "identifier",
              },
            },
          ],

          // strings
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/'([^'\\]|\\.)*$/, "string.invalid"],
          [
            /["']/,
            { token: "string.delim", bracket: "@open", next: "@string.$0" },
          ],

          // numbers
          [/[\d-]+/, "number"],

          // operators
          [
            /@symbols/,
            {
              cases: {
                "@operators": "operator",
                "@default": "",
              },
            },
          ],

          // comments
          [/#.*/, "comment"],

          // whitespace
          { include: "@whitespace" },
        ],
        string: [
          [/[^"']+/, { token: "string" }],
          [/@escapes/, "string.escape"],
          [/\\./, "string.escape.invalid"],

          [
            /["']/,
            {
              cases: {
                "$#==$S2": {
                  token: "string.delim",
                  bracket: "@close",
                  next: "@pop",
                },
                "@default": { token: "string" },
              },
            },
          ],
          [/./, "string.invalid"],
        ],
        whitespace: [[/[ \t\r\n]+/, "white"]],
      },
    })
  );

  disposables.push(
    monaco.languages.registerCompletionItemProvider("sqrl", {
      provideCompletionItems: function (model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: functionsInfo.map((f) => ({
            label: f.name,
            kind: monaco.languages.CompletionItemKind.Function,
            range,
            insertText: f.name,
            description: f.docstring,
          })),
        };
      },
    })
  );

  disposables.push(
    monaco.languages.registerHoverProvider("sqrl", {
      provideHover: function (model, position) {
        const word = model.getWordAtPosition(position);
        const info = word && functions[word.word];
        if (info) {
          const callstring = `${info.name}(${
            functions[word.word].argstring || ""
          })`;

          return {
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            },
            contents: [
              {
                value:
                  `# ${callstring}\n\n_from ${info.package}_\n\n` +
                  functions[word.word].docstring,
              },
            ],
          };
        }
      },
    })
  );

  return {
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  className,
  onChange,
  options = {},
  theme = "vs-dark",
  value,
  style,
  markers,
  sqrlFunctions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const monacoEditorObj = useMonacoEditor();
  const editorRef = useRef<EditorApi.editor.IStandaloneCodeEditor>();

  useEffect(() => {
    editorRef.current?.updateOptions({ theme });
  }, [editorRef.current, theme]);

  useEffect(() => {
    if (!editorRef.current || monacoEditorObj.state !== "success") return;

    const model = editorRef.current.getModel();
    if (!model) return;

    monacoEditorObj.value.editor.setModelMarkers(
      model,
      "monaco editor react",
      markers || []
    );
  }, [editorRef.current, monacoEditorObj.state, markers]);

  useEffect(() => {
    if (monacoEditorObj.state !== "success") return;

    const monacoEditor = monacoEditorObj.value;

    if (!containerRef.current) {
      throw new Error("Missing containerRef");
    }

    // @todo(josh): Not sure if this is the correct way to do this only once per editor? The SQRL
    // functions will be compiled in so they won't change ever.
    const sqrlLanguage = configureSqrlLanguage(
      monacoEditor,
      sqrlFunctions || {}
    );

    const model = monacoEditor.editor.createModel(
      value,
      "sqrl",
      monacoEditor.Uri.file("example.tsx")
    );

    const editor = monacoEditor.editor.create(containerRef.current, {
      scrollBeyondLastLine: true,
      minimap: {
        enabled: true,
      },
      ...options,
      extraEditorClassName: className,
      language: "sqrl",
      model,
      theme,
    });

    editorRef.current = editor;

    // TODO(meyer) debounce this
    const resizeHandler = () => {
      editor.layout();
    };

    window.addEventListener("resize", resizeHandler);

    const onChangeModelContentSubscription = editor.onDidChangeModelContent(
      (event) => {
        const value = editor.getValue() || "";
        onChange?.(value, event);
      }
    );

    return () => {
      sqrlLanguage.dispose();
      editor.dispose();
      model.dispose();
      onChangeModelContentSubscription.dispose();
      window.removeEventListener("resize", resizeHandler);
    };
  }, [monacoEditorObj.state, sqrlFunctions]);

  return <div style={style} ref={containerRef} />;
};
