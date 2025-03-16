/**
 * Base class to extend from
 * Do not instantiate directly
 * 
 * Notes:
 * - https://andyogo.github.io/custom-element-reactions-diagram/
 * - https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements
 */
class HtmlCode extends HTMLElement {
  /** @type {Map<string, string | number | boolean>} */
  _internals = new Map();
  connected = false;
  /** @type {ShadowRoot | null} */
  shadowRoot = null;
  type = 'code';
  uuid = crypto.randomUUID();
  debug = true;

  constructor() {
    super();
    this._internals.set('connected', false);
    this.addEventListener("render", this.renderCallback);
  }

  connectedCallback() {
    this._internals.set('connected', true);
    this.render();
  }

  /**
   * @param {string} name 
   * @param {string} oldValue 
   * @param {string} newValue 
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (this.debug) {
      console.log(`[${this.type} : attributeChanged]`, `- '${name}': '${oldValue}' -> '${newValue}'.`);
    }
    this._internals.set(name, newValue);
    if (this.connected) {
      this.render();
    }
  }

  // override in inherited class
  render() {
    this.dispatchEvent(new CustomEvent('render'));
  }

  renderCallback(e) {
    if (this.debug) {
      console.log(`[${this.type.padEnd(12)} : render]`, e.detail);
    }
    eval(e.detail);
    // debug
    if (!this.debug) {
      return;
    }
    if (!this.shadow) {
      this.shadow = this.attachShadow({ mode: "closed" });
    }
    const code = document.createElement('code');
    code.id = this.uuid;
    code.innerText = e.detail;
    code.style.display = 'block';
    this.shadow.appendChild(code);
  }

  /**
   * @param {string} value 
   * @param {"string" | "number" | "json"} type 
   * @returns 
   */
  parseValue(value, type) {
    switch (type) {
      case 'string':
        return `"${value}"`;
      case 'number':
        return parseInt(value);
      case 'json':
        return JSON.stringify(JSON.parse(value));
      default:
        return value;
    }
  }
}

class HTMLConst extends HtmlCode {
  static observedAttributes = ['type', 'name', 'value'];
  type = 'variable';
  constructor() {
    super();
  }

  render() {
    const name = this._internals.get('name');
    const type = this._internals.get('type');
    const value = this.parseValue(this._internals.get('value'), type);
    this.dispatchEvent(new CustomEvent('render', {
      detail: `window.${name} = ${value};`
    }));
  }
}

class HTMLFunction extends HtmlCode {
  static observedAttributes = [
    'name',
    'body',
    ...new Array(10).fill('p').map((p, i) => `${p}${i + 1}`),
  ];
  type = 'function';
  constructor() {
    super();
  }

  getParams() {
    const params = new Array(10).fill('p').map((p, i) => this._internals.get(`${p}${i + 1}`));
    return params.filter(Boolean);
  }

  render() {
    const name = this._internals.get('name');
    const params = this.getParams();
    const body = this._internals.get('body');
    this.dispatchEvent(new CustomEvent('render', {
      detail: `window.${name} = (${params.join(', ')}) => { ${body} };`
    }));
  }
}

class HTMLFunctionCall extends HtmlCode {
  static observedAttributes = [
    'function',
    'result',
    ...new Array(10).fill(null).map((_, i) => `p${i + 1}`),
    ...new Array(10).fill(null).map((_, i) => `p${i + 1}type`),
  ];
  type = 'functioncall';
  constructor() {
    super();
  }

  getParams() {
    const params = new Array(10).fill(null).map((_, i) => this._internals.get(`p${i + 1}`));
    const types = new Array(10).fill(null).map((_, i) => this._internals.get(`p${i + 1}type`));
    return params
      .filter(Boolean)
      .map((_, i) => this.parseValue(params[i], types[i]));
  }

  render() {
    const functionName = this._internals.get('function');
    const params = this.getParams();
    const resultVariable = this._internals.get('result');
    const resultValue = window[functionName](...params);
    this.dispatchEvent(new CustomEvent('render', {
      detail: `window.${resultVariable} = window.${functionName}(${params}); // ${resultValue}`
    }));
  }
}

customElements.define("html-const", HTMLConst), { extends: 'span' };
customElements.define("html-function", HTMLFunction), { extends: 'div' };
customElements.define("html-functioncall", HTMLFunctionCall), { extends: 'span' };
