/**
 * End-to-end smoke test for the built content script.
 *
 * Loads dist/contentScript.js into a fake DOM shaped like a LinkedIn feed post
 * and verifies the whole flow: boot -> inline button -> generate -> modal ->
 * Insert actually writes into the editor.
 *
 * Run with: npm run smoke  (build first with npm run build)
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = resolve(rootDir, "dist/contentScript.js");

const logs = [];
const sandboxConsole = {
  log: (...args) => logs.push(["log", args.join(" ")]),
  warn: (...args) => logs.push(["warn", args.join(" ")]),
  error: (...args) => logs.push(["error", args.join(" ")]),
};

function parseCompound(compound) {
  const tokens = [];
  const re = /(^[a-zA-Z][\w-]*)|(\.[\w-]+)|(\[[^\]]+\])|(:not\([^)]*\))/g;
  let match;
  while ((match = re.exec(compound))) tokens.push(match[0]);
  return tokens;
}

function matchCompound(element, compound) {
  if (!compound) return false;

  for (const token of parseCompound(compound)) {
    if (token.startsWith(".")) {
      if (!element.classList.contains(token.slice(1))) return false;
    } else if (token.startsWith("[")) {
      const body = token.slice(1, -1);
      const parsed = body.match(
        /^([\w-]+)\s*([*^$]?=)\s*['"]?([^'"\]]*)['"]?\s*(i?)$/
      );
      if (!parsed) return false;
      const [, attr, op, rawValue, flag] = parsed;
      const actual = element.getAttribute(attr);
      if (actual === null) return false;

      let a = actual;
      let v = rawValue;
      if (flag === "i") {
        a = a.toLowerCase();
        v = v.toLowerCase();
      }

      if (op === "=" && a !== v) return false;
      if (op === "*=" && !a.includes(v)) return false;
      if (op === "^=" && !a.startsWith(v)) return false;
      if (op === "$=" && !a.endsWith(v)) return false;
    } else if (token.startsWith(":not(")) {
      const inner = token.slice(5, -1).trim();
      if (matchesSelector(element, inner)) return false;
    } else if (element.tagName !== token.toUpperCase()) {
      return false;
    }
  }

  return true;
}

function matchesSelector(element, selector) {
  return selector.split(",").some((part) => {
    const compounds = part.trim().split(/\s+/).filter(Boolean);
    if (compounds.length === 0) return false;
    if (!matchCompound(element, compounds[compounds.length - 1])) return false;

    let node = element.parentElement;
    for (let i = compounds.length - 2; i >= 0; i--) {
      let found = false;
      while (node) {
        if (matchCompound(node, compounds[i])) {
          found = true;
          node = node.parentElement;
          break;
        }
        node = node.parentElement;
      }
      if (!found) return false;
    }

    return true;
  });
}

class FakeClassList {
  constructor(element) {
    this.element = element;
  }
  get set() {
    return new Set(this.element.className.split(/\s+/).filter(Boolean));
  }
  contains(name) {
    return this.set.has(name);
  }
  add(...names) {
    const set = this.set;
    names.forEach((name) => set.add(name));
    this.element.className = [...set].join(" ");
  }
  remove(...names) {
    const set = this.set;
    names.forEach((name) => set.delete(name));
    this.element.className = [...set].join(" ");
  }
}

class FakeShadowRoot {
  constructor() {
    this.innerHTML = "";
    this.cache = new Map();
  }
  querySelector(selector) {
    return this.get(selector);
  }
  querySelectorAll(selector) {
    if (selector === "[data-action]") {
      return [
        this.get('[data-action="close"]'),
        this.get('[data-action="regenerate"]'),
        this.get('[data-action="copy"]'),
        this.get('[data-action="insert"]'),
      ];
    }
    if (selector === ".btn") {
      return [
        this.get('[data-action="regenerate"]'),
        this.get('[data-action="copy"]'),
        this.get('[data-action="insert"]'),
      ];
    }
    const one = this.get(selector);
    return one ? [one] : [];
  }
  get(selector) {
    if (!this.cache.has(selector)) {
      const element = new FakeElement(
        selector.startsWith("[data-action") ? "button" : "div"
      );
      const action = selector.match(/\[data-action="([^"]+)"\]/);
      if (action) {
        element.setAttribute("data-action", action[1]);
        element.dataset.action = action[1];
      }
      this.cache.set(selector, element);
    }
    return this.cache.get(selector);
  }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.parentElement = null;
    this.listeners = {};
    this._text = "";
    this.value = "";
    this.disabled = false;
    this.isConnected = true;
    this.offsetParent = {};
    this._innerHTML = "";
    this._rect = {
      width: 300,
      height: 80,
      top: 0,
      left: 0,
      right: 300,
      bottom: 80,
    };
  }

  get className() {
    return this.attributes.class || "";
  }
  set className(value) {
    this.attributes.class = value;
  }
  get classList() {
    return new FakeClassList(this);
  }
  get innerHTML() {
    return this._innerHTML;
  }
  set innerHTML(value) {
    this._innerHTML = value;
  }
  get innerText() {
    return this.textContent;
  }
  set innerText(value) {
    this.textContent = value;
  }
  // Matches real DOM semantics: reading aggregates descendants, assigning
  // replaces them.
  get textContent() {
    return this._text + this.children.map((child) => child.textContent).join("");
  }
  set textContent(value) {
    this._text = String(value);
    this.children.forEach((child) => {
      child.parentElement = null;
    });
    this.children = [];
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return name in this.attributes ? this.attributes[name] : null;
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  remove() {
    if (this.parentElement) {
      this.parentElement.children = this.parentElement.children.filter(
        (child) => child !== this
      );
    }
    this.parentElement = null;
    this.isConnected = false;
  }
  contains(node) {
    if (node === this) return true;
    return this.children.some((child) => child.contains(node));
  }
  matches(selector) {
    return matchesSelector(this, selector);
  }
  closest(selector) {
    let node = this;
    while (node) {
      if (node.matches && node.matches(selector)) return node;
      node = node.parentElement;
    }
    return null;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
  querySelectorAll(selector) {
    const found = [];
    const walk = (node) => {
      node.children.forEach((child) => {
        if (matchesSelector(child, selector)) found.push(child);
        walk(child);
      });
    };
    walk(this);
    return found;
  }
  getBoundingClientRect() {
    return this._rect;
  }
  focus() {
    documentStub.activeElement = this;
  }
  select() {
    documentStub.selectionContainer = this;
  }
  blur() {}
  click() {
    this.dispatch("click", makeEvent("click", this));
  }
  addEventListener(type, handler) {
    (this.listeners[type] = this.listeners[type] || []).push(handler);
  }
  removeEventListener(type, handler) {
    this.listeners[type] = (this.listeners[type] || []).filter(
      (existing) => existing !== handler
    );
  }
  dispatch(type, event) {
    (this.listeners[type] || []).forEach((handler) => handler(event));
  }
  dispatchEvent(event) {
    this.dispatch(event.type, event);
    return true;
  }
  attachShadow() {
    this.shadowRoot = new FakeShadowRoot();
    return this.shadowRoot;
  }
}

class FakeTextArea extends FakeElement {}
class FakeInput extends FakeElement {}

function makeEvent(type, target, extra = {}) {
  return {
    type,
    target,
    preventDefault() {},
    stopPropagation() {},
    ...extra,
  };
}

class FakeEvent {
  constructor(type, options = {}) {
    this.type = type;
    Object.assign(this, options);
  }
  preventDefault() {}
  stopPropagation() {}
}

const body = new FakeElement("body");

const documentStub = {
  readyState: "complete",
  body,
  head: new FakeElement("head"),
  documentElement: new FakeElement("html"),
  activeElement: null,
  listeners: {},
  selectionContainer: null,
  addEventListener(type, handler) {
    (this.listeners[type] = this.listeners[type] || []).push(handler);
  },
  removeEventListener(type, handler) {
    this.listeners[type] = (this.listeners[type] || []).filter(
      (existing) => existing !== handler
    );
  },
  dispatch(type, event) {
    (this.listeners[type] || []).forEach((handler) => handler(event));
  },
  createElement(tag) {
    if (tag === "textarea") return new FakeTextArea(tag);
    if (tag === "input") return new FakeInput(tag);
    return new FakeElement(tag);
  },
  querySelector(selector) {
    if (matchesSelector(body, selector)) return body;
    return body.querySelector(selector);
  },
  querySelectorAll(selector) {
    const found = matchesSelector(body, selector) ? [body] : [];
    return found.concat(body.querySelectorAll(selector));
  },
  getSelection() {
    return {
      removeAllRanges() {},
      addRange() {},
      toString: () => documentStub.selectionText || "",
    };
  },
  selectionText: "",
  createRange() {
    const stub = this;
    return {
      selectNodeContents(element) {
        stub.selectionContainer = element;
      },
    };
  },
  execCommand(command, _ui, value) {
    if (command !== "insertText") return false;
    const container = this.selectionContainer;
    if (!container) return false;
    if (value === "") {
      container.textContent = "";
    } else {
      container.textContent = (container.textContent || "") + value;
    }
    return true;
  },
};

const windowStub = {
  innerWidth: 1400,
  innerHeight: 900,
  scrollY: 0,
  listeners: {},
  addEventListener(type, handler) {
    (this.listeners[type] = this.listeners[type] || []).push(handler);
  },
  removeEventListener() {},
  getSelection: () => documentStub.getSelection(),
};

const sentMessages = [];
const REPLY_TEXT =
  "Thanks for sharing this - the hiring angle really resonates.";

const chromeStub = {
  runtime: {
    lastError: undefined,
    getManifest: () => ({ version: "1.1.0" }),
    sendMessage(message, callback) {
      sentMessages.push(message);
      if (message.type === "GET_SETTINGS") {
        callback?.({
          settings: {
            tone: "professional",
            maxLength: 500,
            defaultAction: "insert",
            rateLimit: 50,
            stealthMode: true,
            floatingButton: true,
          },
        });
      } else if (message.type === "GENERATE_REPLY") {
        callback?.({ success: true, reply: REPLY_TEXT, usageCount: 1 });
      }
    },
    onMessage: { addListener() {} },
  },
  storage: { onChanged: { addListener() {} } },
};

// ------------------------------------------------------------- fake LinkedIn --

const post = documentStub.createElement("div");
post.className = "feed-shared-update-v2";
body.appendChild(post);

const postDescription = documentStub.createElement("div");
postDescription.className = "feed-shared-update-v2__description";
postDescription.textContent =
  "We are hiring two backend engineers in Boston to work on our payments platform.";
post.appendChild(postDescription);

const commentBox = documentStub.createElement("div");
commentBox.className = "comments-comment-box";
commentBox._rect = {
  width: 600,
  height: 48,
  top: 0,
  left: 0,
  right: 600,
  bottom: 48,
};
post.appendChild(commentBox);

const addCommentTrigger = documentStub.createElement("button");
addCommentTrigger.className = "comments-comment-box__trigger";
addCommentTrigger.setAttribute("aria-label", "Add a comment");
addCommentTrigger.textContent = "Add a comment...";
commentBox.appendChild(addCommentTrigger);

let commentEditor = null;

// Mimic LinkedIn creating the editor once the user starts a comment.
addCommentTrigger.addEventListener("click", () => {
  if (commentEditor) return;

  const editorWrapper = documentStub.createElement("div");
  editorWrapper.className = "comments-comment-texteditor";

  commentEditor = documentStub.createElement("div");
  commentEditor.className = "ql-editor";
  commentEditor.setAttribute("contenteditable", "true");

  editorWrapper.appendChild(commentEditor);
  commentBox.appendChild(editorWrapper);
});

// A newsletter/article style comment area: different class names, same idea.
const newsletter = documentStub.createElement("article");
newsletter.className = "reader-article";
body.appendChild(newsletter);

const newsletterCommentBox = documentStub.createElement("div");
newsletterCommentBox.className = "reader-comments__comment-box";
newsletter.appendChild(newsletterCommentBox);

const newsletterTrigger = documentStub.createElement("button");
newsletterTrigger.className = "comments-comment-box__trigger";
newsletterTrigger.setAttribute("aria-label", "Add a comment");
newsletterCommentBox.appendChild(newsletterTrigger);

let newsletterEditor = null;
newsletterTrigger.addEventListener("click", () => {
  if (newsletterEditor) return;
  newsletterEditor = documentStub.createElement("div");
  newsletterEditor.className = "ql-editor";
  newsletterEditor.setAttribute("contenteditable", "true");
  newsletterCommentBox.appendChild(newsletterEditor);
});

// A "Catch up" greeting modal (birthday / work anniversary / new job).
const greetingModal = documentStub.createElement("div");
greetingModal.className = "artdeco-modal";
greetingModal.textContent =
  "Congratulate Priya on her work anniversary - 3 years at Northwind Labs";
body.appendChild(greetingModal);

const greetingEditor = documentStub.createElement("div");
greetingEditor.className = "artdeco-textarea";
greetingEditor.setAttribute("contenteditable", "true");
greetingModal.appendChild(greetingEditor);

// Messaging: an open conversation plus its composer.
const messageThread = documentStub.createElement("div");
messageThread.className = "msg-thread";
body.appendChild(messageThread);

const incomingMessage = documentStub.createElement("div");
incomingMessage.className = "msg-s-event-listitem__body";
incomingMessage.textContent =
  "Hi! Are you still interested in the platform engineering role we discussed?";
messageThread.appendChild(incomingMessage);

const messageForm = documentStub.createElement("div");
messageForm.className = "msg-form";
messageThread.appendChild(messageForm);

const messageEditor = documentStub.createElement("div");
messageEditor.className = "msg-form__contenteditable";
messageEditor.setAttribute("contenteditable", "true");
messageForm.appendChild(messageEditor);

const messageFooter = documentStub.createElement("div");
messageFooter.className = "msg-form__footer";
messageForm.appendChild(messageFooter);

// Connection request: "Add a note to your invitation" dialog.
const inviteModal = documentStub.createElement("div");
inviteModal.className = "artdeco-modal";
inviteModal.textContent =
  "Add a note to your invitation. Priya Sharma - Engineering Manager at Northwind Labs";
body.appendChild(inviteModal);

const inviteNote = documentStub.createElement("textarea");
inviteNote.className = "connect-button-send-invite__custom-message";
inviteNote.setAttribute("placeholder", "Add a note");
inviteModal.appendChild(inviteNote);

// A plain text input variant (some one-off note fields are inputs, not textareas).
const plainFieldWrapper = documentStub.createElement("div");
plainFieldWrapper.className = "artdeco-modal";
body.appendChild(plainFieldWrapper);

const plainField = documentStub.createElement("input");
plainField.setAttribute("type", "text");
plainFieldWrapper.appendChild(plainField);

// A conversation pane whose only readable text is our own button label plus one
// real sentence - the shape that made the model reply to "Generating...".
const noisyThread = documentStub.createElement("div");
noisyThread.className = "msg-thread";
body.appendChild(noisyThread);

const leakedLabel = documentStub.createElement("span");
leakedLabel.textContent = "Generating...";
noisyThread.appendChild(leakedLabel);

const realMessage = documentStub.createElement("div");
realMessage.textContent = "Quick question about the staff engineer role";
noisyThread.appendChild(realMessage);

const noisyForm = documentStub.createElement("div");
noisyForm.className = "msg-form";
noisyThread.appendChild(noisyForm);

const noisyEditor = documentStub.createElement("div");
noisyEditor.className = "msg-form__contenteditable";
noisyEditor.setAttribute("contenteditable", "true");
noisyForm.appendChild(noisyEditor);

// An unrecognised composer sitting inside a card that does have text - the shape
// that used to fail with "Add a little context to the text box first".
const unknownCard = documentStub.createElement("div");
unknownCard.className = "article-body";
unknownCard.textContent =
  "Remote work is reshaping how distributed teams plan their quarters.";
body.appendChild(unknownCard);

const unknownWrapper = documentStub.createElement("div");
unknownWrapper.className = "unknown-composer-host";
unknownCard.appendChild(unknownWrapper);

const unknownEditor = documentStub.createElement("div");
unknownEditor.className = "unknown-editor";
unknownEditor.setAttribute("contenteditable", "true");
unknownWrapper.appendChild(unknownEditor);

// A composer with nothing readable around it, but with page text selected.
const bareWrapper = documentStub.createElement("div");
bareWrapper.className = "bare-composer-host";
body.appendChild(bareWrapper);

const bareEditor = documentStub.createElement("div");
bareEditor.className = "bare-editor";
bareEditor.setAttribute("contenteditable", "true");
bareWrapper.appendChild(bareEditor);

// The reported failure: a comment box in a layout with no recognised post
// container, sitting next to the post text as a plain prose block.
const unknownLayout = documentStub.createElement("div");
unknownLayout.className = "scaffold-layout__new-thing";
body.appendChild(unknownLayout);

const layoutPostText = documentStub.createElement("p");
layoutPostText.className = "some-renamed-body-class";
layoutPostText.textContent =
  "Thrilled to share that our team shipped a new payments platform this quarter.";
unknownLayout.appendChild(layoutPostText);

const layoutCommentBox = documentStub.createElement("div");
layoutCommentBox.className = "comments-comment-box";
unknownLayout.appendChild(layoutCommentBox);

const layoutEditor = documentStub.createElement("div");
layoutEditor.className = "ql-editor";
layoutEditor.setAttribute("contenteditable", "true");
layoutCommentBox.appendChild(layoutEditor);

// A comment box surrounded only by UI labels - must not send junk as context.
const junkBox = documentStub.createElement("div");
junkBox.className = "comments-comment-box";
body.appendChild(junkBox);

const junkEditor = documentStub.createElement("div");
junkEditor.className = "ql-editor";
junkEditor.setAttribute("contenteditable", "true");
junkBox.appendChild(junkEditor);

const junkLabels = documentStub.createElement("span");
junkLabels.textContent = "Like Comment Share Repost Send";
junkBox.appendChild(junkLabels);

// ------------------------------------------------------------------- runner --

const sandbox = {
  console: sandboxConsole,
  document: documentStub,
  window: windowStub,
  chrome: chromeStub,
  navigator: { clipboard: { writeText: async () => {} } },
  MutationObserver: class {
    observe() {}
    disconnect() {}
  },
  Event: FakeEvent,
  InputEvent: FakeEvent,
  KeyboardEvent: FakeEvent,
  HTMLTextAreaElement: FakeTextArea,
  HTMLInputElement: FakeInput,
  setTimeout,
  clearTimeout,
};
sandbox.globalThis = sandbox;

const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    console.log(`  FAIL  ${label} ${detail}`);
    failures.push(label);
  }
}

function normalize(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

async function waitFor(condition, timeout = 3000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (condition()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

async function main() {
  console.log("Content script smoke test\n");

  const code = readFileSync(bundlePath, "utf8");

  check("bundle has no static import statements", !/\bimport\s*[{('"]/.test(code));
  check("bundle has no dynamic import()", !/\bimport\(/.test(code));

  vm.runInNewContext(code, vm.createContext(sandbox), {
    filename: "dist/contentScript.js",
  });

  check(
    "content script booted",
    logs.some(([, message]) => message.includes("loaded"))
  );

  const inlineButton = body.querySelector(".ai-reply-btn");
  const floatingButton = body.querySelector(".ai-reply-float-btn");

  check("inline AI button injected into the feed comment box", inlineButton !== null);
  check("floating quick button injected", floatingButton !== null);
  check(
    "button injected into the newsletter comment area",
    newsletterCommentBox.querySelector(".ai-reply-btn") !== null
  );
  check(
    "button injected into the Catch-up greeting modal",
    greetingModal.querySelector(".ai-reply-btn") !== null
  );
  check(
    "button injected into the connection-note dialog",
    inviteModal.querySelector(".ai-reply-btn") !== null
  );
  check(
    "button injected into the messaging composer",
    messageForm.querySelector(".ai-reply-btn") !== null
  );
  check(
    "only one inline button in the messaging composer",
    messageForm.querySelectorAll(".ai-reply-btn").length === 1,
    `(found ${messageForm.querySelectorAll(".ai-reply-btn").length})`
  );

  // Focusing a composer that already has an inline button must not add a
  // second floating button on top of it.
  documentStub.activeElement = messageEditor;
  documentStub.dispatch("focusin", makeEvent("focusin", messageEditor));
  check(
    "floating button stays hidden when an inline button exists",
    floatingButton && floatingButton.style.display === "none",
    `(display: ${floatingButton && floatingButton.style.display})`
  );

  // A field that only exists as a plain text input should still be usable via
  // focus + shortcut (the permissive path).
  documentStub.activeElement = plainField;
  documentStub.dispatch("focusin", makeEvent("focusin", plainField));
  check(
    "plain text input is usable on focus",
    floatingButton && floatingButton.style.display === "flex",
    `(display: ${floatingButton && floatingButton.style.display})`
  );

  if (inlineButton) {
    inlineButton.click();

    const requested = await waitFor(() =>
      sentMessages.some((message) => message.type === "GENERATE_REPLY")
    );
    check("button opened the editor and requested a reply", requested);

    const modalShown = await waitFor(
      () => body.querySelector(".ai-reply-modal-container") !== null
    );
    check("reply modal opened", modalShown);

    const modal = body.querySelector(".ai-reply-modal-container");

    if (modal && modal.shadowRoot) {
      const insertButton = modal.shadowRoot.querySelector(
        '[data-action="insert"]'
      );
      insertButton.dispatch("click", makeEvent("click", insertButton));

      const inserted = await waitFor(
        () =>
          commentEditor &&
          normalize(commentEditor.textContent) === normalize(REPLY_TEXT)
      );
      check(
        "Insert wrote the reply into the LinkedIn editor",
        inserted,
        `(editor text: "${commentEditor ? commentEditor.textContent : "n/a"}")`
      );
    } else {
      check("modal shadow root available", false);
    }
  }

  // The greeting modal should be recognised as its own surface.
  const greetingButton = greetingModal.querySelector(".ai-reply-btn");
  if (greetingButton) {
    greetingButton.click();
    const sent = await waitFor(() =>
      sentMessages.some(
        (message) =>
          message.type === "GENERATE_REPLY" &&
          message.payload?.surface === "greeting"
      )
    );
    check("greeting modal generates with the greeting prompt", sent);
  }

  // Messaging: the conversation above the box is the context.
  const messageButton = messageForm.querySelector(".ai-reply-btn");
  if (messageButton) {
    messageButton.click();
    const sent = await waitFor(() =>
      sentMessages.some(
        (message) =>
          message.type === "GENERATE_REPLY" &&
          message.payload?.surface === "message" &&
          /platform engineering role/i.test(message.payload?.postText || "")
      )
    );
    check("messaging composer reads the conversation as context", sent);
  }

  // The composer must never send our own button label as context.
  const noisyButton = noisyForm.querySelector(".ai-reply-btn");
  if (noisyButton) {
    noisyButton.click();
    const cleaned = await waitFor(() =>
      sentMessages.some(
        (message) =>
          message.type === "GENERATE_REPLY" &&
          /staff engineer role/i.test(message.payload?.postText || "")
      )
    );
    check("real message text is captured", cleaned);

    const noisySends = sentMessages.filter(
      (message) =>
        message.type === "GENERATE_REPLY" &&
        /generating/i.test(message.payload?.postText || "")
    );
    check(
      "our own button label never reaches the prompt",
      noisySends.length === 0,
      `(${noisySends.length} request(s) contained "Generating...")`
    );
  }

  // Generic composer: nearby card text is used instead of erroring out.
  const unknownButton = unknownWrapper.querySelector(".ai-reply-btn");
  if (unknownButton) {
    unknownButton.click();
    const sent = await waitFor(() =>
      sentMessages.some(
        (message) =>
          message.type === "GENERATE_REPLY" &&
          /distributed teams plan their quarters/i.test(message.payload?.postText || "")
      )
    );
    check("unrecognised composer falls back to nearby card text", sent);
  }

  // Generic composer with no nearby text: use the page selection.
  documentStub.selectionText =
    "Priya shared a thoughtful breakdown of platform migration trade-offs.";
  const bareButton = bareWrapper.querySelector(".ai-reply-btn");
  if (bareButton) {
    bareButton.click();
    const sent = await waitFor(() =>
      sentMessages.some(
        (message) =>
          message.type === "GENERATE_REPLY" &&
          /platform migration trade-offs/i.test(message.payload?.postText || "")
      )
    );
    check("composer with no nearby text falls back to the selection", sent);
  }
  documentStub.selectionText = "";

  // Comment box with no recognised post container: find the post text nearby.
  const layoutButton = layoutCommentBox.querySelector(".ai-reply-btn");
  if (layoutButton) {
    layoutButton.click();
    const sent = await waitFor(() =>
      sentMessages.some(
        (message) =>
          message.type === "GENERATE_REPLY" &&
          /shipped a new payments platform/i.test(message.payload?.postText || "")
      )
    );
    check("comment box without a post container finds the post text", sent);
  }

  // A comment box surrounded only by UI labels must not send junk as context.
  const junkButton = junkBox.querySelector(".ai-reply-btn");
  if (junkButton) {
    const before = sentMessages.length;
    junkButton.click();
    await new Promise((resolve) => setTimeout(resolve, 400));
    const junkSends = sentMessages
      .slice(before)
      .filter(
        (message) =>
          message.type === "GENERATE_REPLY" &&
          /like comment share/i.test(message.payload?.postText || "")
      );
    check(
      "UI-only surroundings are rejected instead of sent as context",
      junkSends.length === 0
    );
  }

  // Connection note: the dialog copy is the fallback context.
  const inviteButton = inviteModal.querySelector(".ai-reply-btn");
  if (inviteButton) {
    inviteButton.click();
    const sent = await waitFor(() =>
      sentMessages.some(
        (message) =>
          message.type === "GENERATE_REPLY" &&
          message.payload?.surface === "invite" &&
          (message.payload?.postText || "").length > 0
      )
    );
    check("connection-note dialog generates with context", sent);

    const inviteModalEl = body.querySelector(".ai-reply-modal-container");
    if (inviteModalEl && inviteModalEl.shadowRoot) {
      const insertButton = inviteModalEl.shadowRoot.querySelector(
        '[data-action="insert"]'
      );
      insertButton.dispatch("click", makeEvent("click", insertButton));

      const filled = await waitFor(() => inviteNote.value === REPLY_TEXT);
      check(
        "Insert fills the connection note textarea",
        filled,
        `(value: "${inviteNote.value}")`
      );
    }
  }

  if (commentEditor) {
    documentStub.activeElement = commentEditor;
    const before = sentMessages.filter((m) => m.type === "GENERATE_REPLY").length;

    documentStub.dispatch(
      "keydown",
      makeEvent("keydown", documentStub, {
        altKey: true,
        shiftKey: true,
        code: "KeyG",
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 300));

    const after = sentMessages.filter((m) => m.type === "GENERATE_REPLY").length;
    check("Alt+Shift+G triggers generation", after > before);
  }

  console.log("\n--- content script console output ---");
  logs.forEach(([level, message]) => console.log(`  [${level}] ${message}`));

  if (failures.length) {
    console.log(`\n${failures.length} check(s) failed: ${failures.join(", ")}`);
    process.exit(1);
  }

  console.log("\nAll smoke checks passed.");
  process.exit(0);
}

main().catch((error) => {
  console.error("\nSmoke test crashed:", error);
  process.exit(1);
});
