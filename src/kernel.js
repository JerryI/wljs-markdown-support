import {marked} from "marked"

import katex from 'katex';

const pasteDrop = {
  transaction: (ev, view, id, length) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      const channel = view.dom.ocellref.origin.channel;
      server._emitt(channel, `<|"Channel"->"${id}", "Length"->${length}, "CellType"->"md"|>`, 'Forwarded["CM:DropEvent"]');
    }
  },

  file: (ev, view, id, name, result) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      server.emitt(id, `<|"Data"->"${result}", "Name"->"${name}"|>`, 'File');
    }
  }
}

function inlineKatex(options) {
  return {
    name: 'inlineKatex',
    level: 'inline',
    start(src) { return src.indexOf('$'); },
    tokenizer(src, tokens) {
      const match = src.match(/^\$+([^$\n]+?)\$+/);
      if (match) {
        return {
          type: 'inlineKatex',
          raw: match[0],
          text: match[1].trim()
        };
      }
    },
    renderer(token) {
      console.warn('inlineKatex');
      return katex.renderToString(token.text.replaceAll('\\\\', '\\'), options);
    }
  };
}

function blockKatex(options) {
  return {
    name: 'blockKatex',
    level: 'block',
    start(src) { return src.indexOf('\n$$'); },
    tokenizer(src, tokens) {
      const match = src.match(/^\$\$\n([^$]+?)\n\$\$/);
      if (match) {
        return {
          type: 'blockKatex',
          raw: match[0],
          text: match[1].trim()
        };
      }
    },
    renderer(token) {
      console.warn('blockKatex');
      return `<p style="padding-top: 1em; padding-bottom: 1em;">${katex.renderToString(token.text.replaceAll('\\\\', '\\'), options)}</p>`;
    }
  };
}


const TexOptions = {
  throwOnError: false
};


marked.use({extensions: [inlineKatex(TexOptions), blockKatex(TexOptions)]});

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
      parent.element.classList.add('markdown', 'margin-bottom-fix');
      return this;
    }
  }
  

  window.SupportedLanguages.push({
    check: (r) => {return(r[0].match(/\w*\.(md)$/) != null)},
    plugins: [window.markdown(), window.DropPasteHandlers(pasteDrop)],
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