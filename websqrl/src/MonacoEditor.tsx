import { useRef, useEffect } from "react";
import { useMonacoEditor } from "./useMonacoEditor";
import type EditorApi from "monaco-editor/esm/vs/editor/editor.api";

export type ChangeHandler = (
  value: string,
  event: EditorApi.editor.IModelContentChangedEvent
) => void;

export interface MonacoEditorProps {
  className?: string;
  onChange?: ChangeHandler;
  options?: EditorApi.editor.IStandaloneEditorConstructionOptions;
  theme?: string;
  value: string;
  style?: React.CSSProperties;
  markers?: Omit<EditorApi.editor.IMarkerData, "relatedInformation">[];
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  className,
  onChange,
  options = {},
  theme = "vs-dark",
  value,
  style,
  markers,
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

    const model = monacoEditor.editor.createModel(
      value,
      "cpp",
      monacoEditor.Uri.file("example.tsx")
    );

    const editor = monacoEditor.editor.create(containerRef.current, {
      scrollBeyondLastLine: true,
      minimap: {
        enabled: true,
      },
      ...options,
      extraEditorClassName: className,
      language: "cpp",
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
      editor.dispose();
      model.dispose();
      onChangeModelContentSubscription.dispose();
      window.removeEventListener("resize", resizeHandler);
    };
  }, [monacoEditorObj.state]);

  return <div style={style} ref={containerRef} />;
};
