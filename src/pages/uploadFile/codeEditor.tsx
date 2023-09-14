import CodeMirror from '@uiw/react-codemirror';
import { createTheme } from '@uiw/codemirror-themes';
import { tags as t } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';

const myTheme = createTheme({
  theme: 'light',
  settings: {
    background: '#ffffff',
    foreground: '#4D4D4C',
    caret: '#AEAFAD',
    selection: '#D6D6D6',
    selectionMatch: '#D6D6D6',
    gutterBackground: '#FFFFFF',
    gutterForeground: '#4D4D4C',
    gutterBorder: '#dddddd',
    gutterActiveForeground: '',
    lineHighlight: '#EFEFEF',
  },
  styles: [
    { tag: t.comment, color: '#787b80' },
    { tag: t.definition(t.typeName), color: '#194a7b' },
    { tag: t.typeName, color: '#194a7b' },
    { tag: t.tagName, color: '#008a02' },
    { tag: t.variableName, color: '#1a00db' },
  ],
});

function Editor({ onChange, defaultValue }: { onChange: (e: string) => any, defaultValue?: string }) {
  return (
    <CodeMirror
      value={defaultValue || ''}
      height="70vh"
      theme={'dark'}
      // theme={myTheme}
      extensions={[javascript({ jsx: false })]}
      onChange={(value: any, viewUpdate: any) => {
        onChange(value)
      }}
    />
  );
}
export default Editor;