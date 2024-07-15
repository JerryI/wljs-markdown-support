let Marked;


await window.interpretate.shared.Marked.load();
Marked = window.interpretate.shared.Marked.default;

/*const renderer = new Marked.Renderer();
const linkRenderer = renderer.link;
renderer.link = (href, title, text) => {
  const localLink = href.startsWith(`${location.protocol}//${location.hostname}`);
  const html = linkRenderer.call(renderer, href, title, text);
  return localLink ? html : html.replace(/^<a /, `<a target="_blank" rel="noreferrer noopener nofollow" `);
};*/

let katex;


await window.interpretate.shared.katex.load();
katex = window.interpretate.shared.katex.default;

const pasteFile = {
  transaction: (ev, view, id, length) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      const channel = view.dom.ocellref.origin.channel;
      server._emitt(channel, `<|"Channel"->"${id}", "Length"->${length}, "CellType"->"md"|>`, 'Forwarded["CM:PasteEvent"]');
    }
  },

  file: (ev, view, id, name, result) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      server.emitt(id, `<|"Data"->"${result}", "Name"->"${name}"|>`, 'File');
    }
  }
};

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
};

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

function mark(options) {
  return {
    name: 'mark',
    level: 'inline',
    start(src) { return src.indexOf('=='); },
    tokenizer(src, tokens) {
      const match = src.match(/^==+([^=\n]+?)==+/);
      if (match) {
        return {
          type: 'mark',
          raw: match[0],
          text: match[1].trim()
        };
      }
    },
    renderer(token) {
      console.warn('mark');
      return '<mark>'+token.text+'</mark>';
    }
  };
}

function feObjects(options) {
  return {
    name: 'frontendObject',
    level: 'inline',
    start(src) { return src.indexOf('FrontEndExecutable['); },
    tokenizer(src, tokens) {
      const match = src.match(/^FrontEndExecutable\[+([^\[\n]+?)\]+/);
      if (match) {
        return {
          type: 'frontendObject',
          raw: match[0],
          text: match[1].trim()
        };
      }
    },
    renderer(token, o) {
      console.warn('frontendObject');
      const obj = {uid: token.text, elementId: 'femarkdown-'+uuidv4()};
      options.buffer.push(obj);
      console.warn(this);
      return `<div class="markdown-feobject" id="${obj.elementId}"></div>`;
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
      return `<p style="padding-top: 1em; padding-bottom: 1em;">${katex.renderToString(token.text.replaceAll('\\\\', '\\'), {displayMode: true})}</p>`;
    }
  };
}


const TexOptions = {
  throwOnError: false
};


//marked.use({extensions: [inlineKatex(TexOptions), blockKatex(TexOptions), feObjects()], renderer});

function unicodeToChar(text) {
  return text.replace(/\\:[\da-f]{4}/gi, 
         function (match) {
              return String.fromCharCode(parseInt(match.replace(/\\:/g, ''), 16));
         });
}


class MarkdownCell {
    origin = {}
    feObjects = []
    envs = []

    dispose() {
      console.warn('Markdown cell dispose...');
      for (const env of this.envs) {
        for (const obj of Object.values(env.global.stack))  {
          console.log('dispose');
          obj.dispose();
        }
      }
    }
    
    constructor(parent, data) {
      console.log('marked data:::');
      console.log(data);
      const self = this;
      
      const marked = new Marked({async: true, extensions: [inlineKatex(TexOptions), mark(), blockKatex(), feObjects({buffer: self.feObjects})]});

      marked.parse(unicodeToChar(data)).then((res) => {
        parent.element.innerHTML = res;
        self.feObjects.forEach(async (el) => {
          const cuid = Date.now() + Math.floor(Math.random() * 10009);
          var global = {call: cuid};

          console.warn('loading executable on a markdown field...');
          console.log(el.uid);
          
      
          let env = {global: global, element: document.getElementById(el.elementId)}; 
          console.log("Marked: creating an object");


          console.log('forntend executable');

          let obj;
          console.log('check cache');
          if (ObjectHashMap[el.uid]) {
              obj = ObjectHashMap[el.uid];
          } else {
              obj = new ObjectStorage(el.uid);
          }
          console.log(obj);
      
          const copy = env;
          const store = await obj.get();
          const instance = new ExecutableObject('marked-stored-'+uuidv4(), copy, store);
          instance.assignScope(copy);
          obj.assign(instance);
      
          instance.execute();          
      
          self.envs.push(env);     
        });
      });

      parent.element.classList.add('markdown', 'margin-bottom-fix');

      return this;
    }
  }
  

  window.SupportedLanguages.push({
    check: (r) => {return(r[0].match(/\w*\.(md)$/) != null)},
    plugins: [window.markdown(), window.DropPasteHandlers(pasteDrop, pasteFile)],
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
