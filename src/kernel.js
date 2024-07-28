
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
}

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
      
      const marked = new Marked({async: true, extensions: [inlineKatex(TexOptions), mark(), blockKatex(TexOptions), feObjects({buffer: self.feObjects})]});

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

  let ExcalidrawLib;
  let React;
  let ReactDOM;
  
  const codemirror = window.SupportedCells['codemirror'].context; 

  function throttle(func, ms) {

    let isThrottled = false,
      savedArgs,
      savedThis;
  
    function wrapper() {
  
      if (isThrottled) { // (2)
        savedArgs = arguments;
        savedThis = this;
        return;
      }
  
      func.apply(this, arguments); // (1)
  
      isThrottled = true;
  
      setTimeout(function() {
        isThrottled = false; // (3)
        if (savedArgs) {
          wrapper.apply(savedThis, savedArgs);
          savedArgs = savedThis = null;
        }
      }, ms);
    }
  
    return wrapper;
  }

  const ExcalidrawWindow = (scene, cchange) => () => {
    const [canvasUrl, setCanvasUrl] = React.useState("");
    const [excalidrawAPI, setExcalidrawAPI] = React.useState(null);
  
    const UIOptions = {
      canvasActions: {
        loadScene: true,
        saveToActiveFile: true,
        help: false,
        toggleTheme: false,
        changeViewBackgroundColor: false
      },
      saveToActiveFile: true,
      toggleTheme:false
    };
  
    return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "div",
          {
            style: { height: "500px" },
          },
          React.createElement(ExcalidrawLib.Excalidraw, {UIOptions:UIOptions, initialData: {elements: scene, appState: {viewBackgroundColor: 'transparent', zenModeEnabled: true}}, onChange: cchange, excalidrawAPI : (api) => setExcalidrawAPI(api)}),
        ),
      );
  };

  const matcher = new codemirror.MatchDecorator({
    regexp: /!!\[.*\]/g,
    maxLength: Infinity,
    decoration: (match, view, pos) => {
     
      return codemirror.Decoration.replace({
        widget: new ExcalidrawWidget(match[0], view, pos)
      })
    }
  });

  const excalidrawHolder = codemirror.ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.excalidrawHolder = matcher.createDeco(view);
      }
      update(update) {
        this.excalidrawHolder = matcher.updateDeco(update, this.excalidrawHolder);
      }
    },
    {
      decorations: instance => instance.excalidrawHolder,
      provide: plugin => codemirror.EditorView.atomicRanges.of(view => {
        return view.plugin(plugin)?.excalidrawHolder || codemirror.Decoration.none
      })
    }
  );  

  class ExcalidrawWidget extends codemirror.WidgetType {
    constructor(match, view, pos) {
      //console.log('created');
      super();
      this.match = match;
      this.pos   = pos;
      this.view = view;
    }
  
    eq(other) {
      return false;
    }
  
    updateDOM(dom) {
      dom.ExcalidrawWidget = this;
      return true;
    }
  
    updateContent(data) {
      const self = this;
      
      const newData = data;
      const changes = {from: self.pos + 2, to: self.pos + self.match.length, insert: newData};
      this.view.dispatch({changes: changes});
    }
  
    toDOM(view) {
      const match = this.match;
  
      let elt = document.createElement("div");
      elt.ExcalidrawWidget = this;
  
      const mount = async (element, data) => { 
        if (!ExcalidrawLib) {
          if (!window.interpretate.shared.Excalidraw) {
            element.innerHTML = `<span style="color:red">No shared library ExcalidrawLib found</span>`;
            return;
          }
          await window.interpretate.shared.Excalidraw.load();
          ExcalidrawLib = window.interpretate.shared.Excalidraw.Excalidraw.default;
        }

        if (!React) {
          if (!window.interpretate.shared.React) {
            element.innerHTML = `<span style="color:red">No shared library React found</span>`;
            return;
          }          
          await window.interpretate.shared.React.load();
          React = window.interpretate.shared.React.React.default;
          ReactDOM = window.interpretate.shared.React.ReactDOM.default;
        }
      
        const excalidrawWrapper = element;
        const root = ReactDOM.createRoot(excalidrawWrapper);
        element.reactRoot = root;
        console.log('React Render!');
  
        const dom = element;
  
        let previous = '';
        const change = (elements, appState) => {
          if (!dom.ExcalidrawWidget) return;
          const string = JSON.stringify(elements);
          if (string != previous) {
            previous = string;
            console.log('save');
            dom.ExcalidrawWidget.updateContent(string);
          }
        }
      
        const cchange = throttle(change, 700);
        
        let scene;
        
        try {
          scene = JSON.parse(data.slice(2));
        } catch(e) {
          dom.innerHTML = `<span style="color:red; padding: 0.5rem;">Error while parsing expression</span>`;
          return;
        }
      
        console.log('Mount!');
      
        dom.addEventListener('keypress', (ev) => {
      
            if (ev.shiftKey && ev.key == "Enter") {
              console.log(ev);
              //if (debounce) return;
              const origin = view.state.facet(codemirror.originFacet)[0].origin;
              console.log('EVAL');
              origin.eval(view.state.doc.toString());
              debounce = true;
      
            }
        });
  
        root.render(React.createElement(ExcalidrawWindow(scene, cchange, {})));
  
      }
  
      const origin = view.state.facet(codemirror.originFacet)[0].origin;
      
      let mounted = false;
      if (!origin.props["Hidden"]) {
        mount(elt, match);
        mounted = true;
    
      }
    
      origin.addEventListener('property', (ev) => {
        if (ev.key != 'Hidden') return;
        if (ev.value) {
          if (mounted) {
            elt.reactRoot.unmount();
            console.warn('Unmount react');
            mounted = false;
          }
        } else {
          if (!mounted) {
            mount(elt, elt.ExcalidrawWidget.match);
            mounted = true;
          }
        }
      });   
  
      return elt;
    }
    ignoreEvent(ev) {
      return true;
    }
  
    destroy(dom) {
      console.log('Excalidraw widget was destroyed');
      if (!dom.reactRoot) return;
      dom.reactRoot.unmount();
      dom.ExcalidrawWidget = undefined;
    }
  }  


  window.SupportedLanguages.push({
    check: (r) => {return(r[0].match(/\w*\.(md)$/) != null)},
    plugins: [codemirror.markdown(), codemirror.DropPasteHandlers(pasteDrop, pasteFile), excalidrawHolder],
    name: codemirror.markdownLanguage.name
  });

  window.SupportedCells['markdown'] = {
    view: MarkdownCell
  };

  var generateSVG = async (data) => {
    if (!ExcalidrawLib) {
      if (!window.interpretate.shared.ExcalidrawLib) {
        return `<span style="color:red">No sharedlib Excalidraw found!</span>`;
      }
      await window.interpretate.shared.Excalidraw.load();
      ExcalidrawLib = window.interpretate.shared.Excalidraw.Excalidraw.default;
      //ExcalidrawLib = (await import('@excalidraw/excalidraw')).default;
    }
  
    let decoded;
    try {
      decoded = JSON.parse(data);
  
    } catch (e) {
  
      return `<span style="color:red">${e}</span>`;
    }
  
    const svg = await ExcalidrawLib.exportToSvg({
      elements: decoded,
      appState: {exportBackground: false},
      exportWithDarkMode: false
    });
  
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    const stringed = svg.outerHTML;
    svg.remove();
  
    return stringed;
  }

  core['Internal`EXJSEvaluator'] = async (args, env) => {
    let data = await interpretate(args[0], env);

    if (!Array.isArray(data)) {
      data = [data];
    }  

    const result = [];
    for (const a of data) {
      const r = await generateSVG(a);
      result.push(r);
    }
    
    return result;
  }

