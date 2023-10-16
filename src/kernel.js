import {marked} from "marked"
import markedKatex from "marked-katex-extension"


const TexOptions = {
  throwOnError: false
};


marked.use(markedKatex(TexOptions));

function unicodeToChar(text) {
  return text.replace(/\\:[\da-f]{4}/gi, 
         function (match) {
              return String.fromCharCode(parseInt(match.replace(/\\:/g, ''), 16));
         });
}

class MarkdownCell {
    origin = {}

    dispose() {
      
    }
    
    constructor(parent, data) {
      console.log('marked data:::');
      console.log(data);
      parent.element.innerHTML = marked.parse(unicodeToChar(data));
      parent.element.classList.add('padding-fix');
      return this;
    }
  }
  

  window.SupportedLanguages.push({
    check: (r) => {return(r[0] === '.md')},
    plugins: [window.markdown()],
    name: window.markdownLanguage.name
  });

  window.SupportedCells['markdown'] = {
    view: MarkdownCell
  };

  /*globalExtensions.push(keymap.of([{ key: "Ctrl-7", run: function() {
    return ({ state, dispatch }) => {
      if (state.readOnly) return false;
      let changes = state.changeByRange((range) => {
        let { from, to } = range;
        //if (atEof) from = to = (to <= line.to ? line : state.doc.lineAt(to)).to
  
        return {
          changes: { from, to, insert: ".md\n" },
          range: EditorSelection.cursor(from + 3)
        };
      });
  
      dispatch(
        state.update(changes, { scrollIntoView: true, userEvent: "input" })
      );
      return true;
    };    
  } }]));*/