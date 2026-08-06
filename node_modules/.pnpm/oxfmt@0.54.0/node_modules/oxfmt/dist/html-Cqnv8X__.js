import { n as __esmMin } from "./chunk-CNf5ZN-e.js";
//#region ../../node_modules/.pnpm/prettier@3.8.3/node_modules/prettier/plugins/html.mjs
function ns(e) {
	return this[e < 0 ? this.length + e : e];
}
function as(e) {
	if (typeof e == "string") return Ve;
	if (Array.isArray(e)) return Ue;
	if (!e) return;
	let { type: t } = e;
	if (mt.has(t)) return t;
}
function ls(e) {
	let t = e === null ? "null" : typeof e;
	if (t !== "string" && t !== "object") return `Unexpected doc '${t}', 
Expected it to be 'string' or 'object'.`;
	if (ft(e)) throw new Error("doc is valid.");
	let r = Object.prototype.toString.call(e);
	if (r !== "[object Object]") return `Unexpected doc '${r}'.`;
	let n = os([...mt].map((i) => `'${i}'`));
	return `Unexpected doc.type '${e.type}'.
Expected it to be ${n}.`;
}
function Gt(e, t) {
	if (typeof e == "string") return t(e);
	let r = /* @__PURE__ */ new Map();
	return n(e);
	function n(s) {
		if (r.has(s)) return r.get(s);
		let a = i(s);
		return r.set(s, a), a;
	}
	function i(s) {
		switch (ft(s)) {
			case Ue: return t(s.map(n));
			case ke: return t({
				...s,
				parts: s.parts.map(n)
			});
			case xe: return t({
				...s,
				breakContents: n(s.breakContents),
				flatContents: n(s.flatContents)
			});
			case we: {
				let { expandedStates: a, contents: o } = s;
				return a ? (a = a.map(n), o = a[0]) : o = n(o), t({
					...s,
					contents: o,
					expandedStates: a
				});
			}
			case be:
			case Te:
			case ye:
			case ht:
			case ut: return t({
				...s,
				contents: n(s.contents)
			});
			case Ve:
			case lt:
			case ct:
			case pt:
			case $:
			case Ae: return t(s);
			default: throw new Ir(s);
		}
	}
}
function L(e, t = Rr) {
	return Gt(e, (r) => typeof r == "string" ? B(t, r.split(`
`)) : r);
}
function A(e) {
	return D(e), {
		type: Te,
		contents: e
	};
}
function cs(e, t) {
	return Br(e), D(t), {
		type: be,
		contents: t,
		n: e
	};
}
function qr(e) {
	return cs(Number.NEGATIVE_INFINITY, e);
}
function gt(e) {
	return Mr(e), {
		type: ke,
		parts: e
	};
}
function E(e, t = {}) {
	return D(e), dt(t.expandedStates, !0), {
		type: we,
		id: t.id,
		contents: e,
		break: !!t.shouldBreak,
		expandedStates: t.expandedStates
	};
}
function j(e, t = "", r = {}) {
	return D(e), t !== "" && D(t), {
		type: xe,
		breakContents: e,
		flatContents: t,
		groupId: r.groupId
	};
}
function Fr(e, t) {
	return D(e), {
		type: ye,
		contents: e,
		groupId: t.groupId,
		negate: t.negate
	};
}
function B(e, t) {
	D(e), dt(t);
	let r = [];
	for (let n = 0; n < t.length; n++) n !== 0 && r.push(e), r.push(t[n]);
	return r;
}
function fs(e, t) {
	let { preferred: r, alternate: n } = t === !0 || t === "'" ? hs : ms, { length: i } = e, s = 0, a = 0;
	for (let o = 0; o < i; o++) {
		let c = e.charCodeAt(o);
		c === r.codePoint ? s++ : c === n.codePoint && a++;
	}
	return (s > a ? n : r).character;
}
function zt(e) {
	if (typeof e != "string") throw new TypeError("Expected a string");
	return e.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
function zr(e, t, r) {
	if (e.kind === "text" || e.kind === "comment") return null;
	if (e.kind === "yaml" && delete t.value, e.kind === "attribute") {
		let { fullName: n, value: i } = e;
		n === "style" || n === "class" || n === "srcset" && (r.fullName === "img" || r.fullName === "source") || n === "allow" && r.fullName === "iframe" || n.startsWith("on") || n.startsWith("@") || n.startsWith(":") || n.startsWith(".") || n.startsWith("#") || n.startsWith("v-") || n === "vars" && r.fullName === "style" || (n === "setup" || n === "generic") && r.fullName === "script" || n === "slot-scope" || n.startsWith("(") || n.startsWith("[") || n.startsWith("*") || n.startsWith("bind") || n.startsWith("i18n") || n.startsWith("on-") || n.startsWith("ng-") || i?.includes("{{") ? delete t.value : i && (t.value = w(0, i, /'|&quot;|&apos;/gu, "\""));
	}
	if (e.kind === "docType" && (t.value = w(0, e.value.toLowerCase(), /\s+/gu, " ")), e.kind === "angularControlFlowBlock" && e.parameters?.children) for (let n of t.parameters.children) Ss.has(e.name) ? delete n.expression : n.expression = n.expression.trim();
	e.kind === "angularIcuExpression" && (t.switchValue = e.switchValue.trim()), e.kind === "angularLetDeclarationInitializer" && delete t.value, e.kind === "element" && e.isVoid && !e.isSelfClosing && (t.isSelfClosing = !0);
}
function X(e, t = !0) {
	return [A([k, e]), t ? k : ""];
}
function V(e, t) {
	let r = e.type === "NGRoot" ? e.node.type === "NGMicrosyntax" && e.node.body.length === 1 && e.node.body[0].type === "NGMicrosyntaxExpression" ? e.node.body[0].expression : e.node : e.type === "JsExpressionRoot" ? e.node : e;
	return r && (r.type === "ObjectExpression" || r.type === "ArrayExpression" || (t.parser === "__vue_expression" || t.parser === "__vue_ts_expression" || t.parser === "__ng_binding" || t.parser === "__ng_directive") && (r.type === "TemplateLiteral" || r.type === "StringLiteral"));
}
async function x(e, t, r, n) {
	r = {
		__isInHtmlAttribute: !0,
		__embeddedInHtml: !0,
		...r
	};
	let i = !0;
	n && (r.__onHtmlBindingRoot = (a, o) => {
		i = n(a, o);
	});
	let s = await t(e, r, t);
	return i ? E(s) : X(s);
}
function Es(e, t, r, n) {
	let { node: i } = r, s = n.originalText.slice(i.sourceSpan.start.offset, i.sourceSpan.end.offset);
	return /^\s*$/u.test(s) ? "" : x(s, e, {
		parser: "__ng_directive",
		__isInHtmlAttribute: !1
	}, V);
}
function Ts() {
	let e = globalThis, t = e.Deno?.build?.os;
	return typeof t == "string" ? t === "windows" : e.navigator?.platform?.startsWith("Win") ?? e.process?.platform?.startsWith("win") ?? !1;
}
function Xr(e) {
	if (e = e instanceof URL ? e : new URL(e), e.protocol !== "file:") throw new TypeError(`URL must be a file URL: received "${e.protocol}"`);
	return e;
}
function ws(e) {
	return e = Xr(e), decodeURIComponent(e.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
}
function ks(e) {
	e = Xr(e);
	let t = decodeURIComponent(e.pathname.replace(/\//g, "\\").replace(/%(?![0-9A-Fa-f]{2})/g, "%25")).replace(/^\\*([A-Za-z]:)(\\|$)/, "$1\\");
	return e.hostname !== "" && (t = `\\\\${e.hostname}${t}`), t;
}
function jt(e) {
	return bs ? ks(e) : ws(e);
}
function xs(e) {
	return Array.isArray(e) && e.length > 0;
}
function Jr(e, t) {
	if (!t) return;
	let r = Kr(t).toLowerCase();
	return e.find(({ filenames: n }) => n?.some((i) => i.toLowerCase() === r)) ?? e.find(({ extensions: n }) => n?.some((i) => r.endsWith(i)));
}
function ys(e, t) {
	if (t) return e.find(({ name: r }) => r.toLowerCase() === t) ?? e.find(({ aliases: r }) => r?.includes(t)) ?? e.find(({ extensions: r }) => r?.includes(`.${t}`));
}
function Zr(e, t) {
	if (t) {
		if (Qr(t)) try {
			t = jt(t);
		} catch {
			return;
		}
		if (typeof t == "string") return e.find(({ isSupported: r }) => r?.({ filepath: t }));
	}
}
function Ns(e, t) {
	let r = jr(0, e.plugins).flatMap((i) => i.languages ?? []);
	return (ys(r, t.language) ?? Jr(r, t.physicalFile) ?? Jr(r, t.file) ?? Zr(r, t.physicalFile) ?? Zr(r, t.file) ?? As?.(r, t.physicalFile))?.parsers[0];
}
function Ls(e) {
	return !!e?.[St];
}
function Ps(e) {
	let t = e.slice(0, We);
	if (t !== "---" && t !== "+++") return;
	let r = e.indexOf(`
`, We);
	if (r === -1) return;
	let n = e.slice(We, r).trim(), i = e.indexOf(`
${t}`, r), s = n;
	if (s || (s = t === "+++" ? "toml" : "yaml"), i === -1 && t === "---" && s === "yaml" && (i = e.indexOf(`
...`, r)), i === -1) return;
	let a = i + 1 + We, o = e.charAt(a + 1);
	if (!/\s?/u.test(o)) return;
	let c = e.slice(0, a), u;
	return {
		language: s,
		explicitLanguage: n || null,
		value: e.slice(r + 1, i),
		startDelimiter: t,
		endDelimiter: c.slice(-We),
		raw: c,
		start: {
			line: 1,
			column: 0,
			index: 0
		},
		end: {
			index: c.length,
			get line() {
				return u ?? (u = c.split(`
`)), u.length;
			},
			get column() {
				return u ?? (u = c.split(`
`)), M(0, u, -1).length;
			}
		},
		[St]: !0
	};
}
function Os(e) {
	let t = Ps(e);
	return t ? {
		frontMatter: t,
		get content() {
			let { raw: r } = t;
			return w(0, r, /[^\n]/gu, " ") + e.slice(r.length);
		}
	} : { content: e };
}
function Ds(e) {
	return e.kind === "element" && !e.hasExplicitNamespace && !["html", "svg"].includes(e.namespace);
}
function Et(e, t) {
	return !!(e.kind === "ieConditionalComment" && e.lastChild && !e.lastChild.isSelfClosing && !e.lastChild.endSourceSpan || e.kind === "ieConditionalComment" && !e.complete || ae(e) && e.children.some((r) => r.kind !== "text" && r.kind !== "interpolation") || Tt(e, t) && !q(e, t) && e.kind !== "interpolation");
}
function oe(e) {
	return e.kind === "attribute" || !e.parent || !e.prev ? !1 : Rs(e.prev);
}
function Rs(e) {
	return e.kind === "comment" && e.value.trim() === "prettier-ignore";
}
function O(e) {
	return e.kind === "text" || e.kind === "comment";
}
function q(e, t) {
	return e.kind === "element" && (e.fullName === "script" || e.fullName === "style" || e.fullName === "svg:style" || e.fullName === "svg:script" || e.fullName === "mj-style" && t.parser === "mjml" || se(e) && (e.name === "script" || e.name === "style"));
}
function nn(e, t) {
	return e.children && !q(e, t);
}
function sn(e, t) {
	return q(e, t) || e.kind === "interpolation" || Zt(e);
}
function Zt(e) {
	return gn(e).startsWith("pre");
}
function an(e, t) {
	let r = n();
	if (r && !e.prev && e.parent?.tagDefinition?.ignoreFirstLf) return e.kind === "interpolation";
	return r;
	function n() {
		return ie(e) || e.kind === "angularControlFlowBlock" ? !1 : (e.kind === "text" || e.kind === "interpolation") && e.prev && (e.prev.kind === "text" || e.prev.kind === "interpolation") ? !0 : !e.parent || e.parent.cssDisplay === "none" ? !1 : ae(e.parent) ? !0 : !(!e.prev && (e.parent.kind === "root" || ae(e) && e.parent || q(e.parent, t) || $e(e.parent, t) || !Vs(e.parent.cssDisplay)) || e.prev && !Gs(e.prev.cssDisplay));
	}
}
function on(e, t) {
	return ie(e) || e.kind === "angularControlFlowBlock" ? !1 : (e.kind === "text" || e.kind === "interpolation") && e.next && (e.next.kind === "text" || e.next.kind === "interpolation") ? !0 : !e.parent || e.parent.cssDisplay === "none" ? !1 : ae(e.parent) ? !0 : !(!e.next && (e.parent.kind === "root" || ae(e) && e.parent || q(e.parent, t) || $e(e.parent, t) || !Us(e.parent.cssDisplay)) || e.next && !Ws(e.next.cssDisplay));
}
function ln(e, t) {
	return zs(e.cssDisplay) && !q(e, t);
}
function Ge(e) {
	return ie(e) || e.next && e.sourceSpan.end && e.sourceSpan.end.line + 1 < e.next.sourceSpan.start.line;
}
function cn(e) {
	return er(e) || e.kind === "element" && e.children.length > 0 && ([
		"body",
		"script",
		"style"
	].includes(e.name) || e.children.some((t) => Bs(t))) || e.firstChild && e.firstChild === e.lastChild && e.firstChild.kind !== "text" && pn(e.firstChild) && (!e.lastChild.isTrailingSpaceSensitive || hn(e.lastChild));
}
function er(e) {
	return e.kind === "element" && e.children.length > 0 && ([
		"html",
		"head",
		"ul",
		"ol",
		"select"
	].includes(e.name) || e.cssDisplay.startsWith("table") && e.cssDisplay !== "table-cell");
}
function Ct(e) {
	return mn(e) || e.prev && Ms(e.prev) || un(e);
}
function Ms(e) {
	return mn(e) || e.kind === "element" && e.fullName === "br" || un(e);
}
function un(e) {
	return pn(e) && hn(e);
}
function pn(e) {
	return e.hasLeadingSpaces && (e.prev ? e.prev.sourceSpan.end.line < e.sourceSpan.start.line : e.parent.kind === "root" || e.parent.startSourceSpan.end.line < e.sourceSpan.start.line);
}
function hn(e) {
	return e.hasTrailingSpaces && (e.next ? e.next.sourceSpan.start.line > e.sourceSpan.end.line : e.parent.kind === "root" || e.parent.endSourceSpan && e.parent.endSourceSpan.start.line > e.sourceSpan.end.line);
}
function mn(e) {
	switch (e.kind) {
		case "ieConditionalComment":
		case "comment":
		case "directive": return !0;
		case "element": return ["script", "select"].includes(e.name);
	}
	return !1;
}
function vt(e) {
	return e.lastChild ? vt(e.lastChild) : e;
}
function Bs(e) {
	return e.children?.some((t) => t.kind !== "text");
}
function fn(e) {
	if (e) switch (e) {
		case "module":
		case "text/javascript":
		case "text/babel":
		case "text/jsx":
		case "application/javascript": return "babel";
		case "application/x-typescript": return "typescript";
		case "text/markdown": return "markdown";
		case "text/html": return "html";
		case "text/x-handlebars-template": return "glimmer";
		default: if (e.endsWith("json") || e.endsWith("importmap") || e === "speculationrules") return "json";
	}
}
function qs(e, t) {
	let { name: r, attrMap: n } = e;
	if (r !== "script" || Object.prototype.hasOwnProperty.call(n, "src")) return;
	let { type: i, lang: s } = e.attrMap;
	return !s && !i ? "babel" : _t(t, { language: s }) ?? fn(i);
}
function Fs(e, t) {
	if (!Tt(e, t)) return;
	let { attrMap: r } = e;
	if (Object.prototype.hasOwnProperty.call(r, "src")) return;
	let { type: n, lang: i } = r;
	return _t(t, { language: i }) ?? fn(n);
}
function Hs(e, t) {
	if (e.name === "style") {
		let { lang: r } = e.attrMap;
		return r ? _t(t, { language: r }) : "css";
	}
	if (e.name === "mj-style" && t.parser === "mjml") return "css";
}
function tr(e, t) {
	return qs(e, t) ?? Hs(e, t) ?? Fs(e, t);
}
function ze(e) {
	return e === "block" || e === "list-item" || e.startsWith("table");
}
function Vs(e) {
	return !ze(e) && e !== "inline-block";
}
function Us(e) {
	return !ze(e) && e !== "inline-block";
}
function Ws(e) {
	return !ze(e);
}
function Gs(e) {
	return !ze(e);
}
function zs(e) {
	return !ze(e) && e !== "inline-block";
}
function ae(e) {
	return gn(e).startsWith("pre");
}
function $s(e, t) {
	let r = e;
	for (; r;) {
		if (t(r)) return !0;
		r = r.parent;
	}
	return !1;
}
function dn(e, t) {
	if (le(e, t)) return "block";
	if (e.prev?.kind === "comment") {
		let n = e.prev.value.match(/^\s*display:\s*([a-z]+)\s*$/u);
		if (n) return n[1];
	}
	let r = !1;
	if (e.kind === "element" && e.namespace === "svg") if ($s(e, (n) => n.fullName === "svg:foreignObject")) r = !0;
	else return e.name === "svg" ? "inline-block" : "block";
	switch (t.htmlWhitespaceSensitivity) {
		case "strict": return "inline";
		case "ignore": return "block";
		default: if (e.kind === "element" && (!e.namespace || r || se(e)) && Object.prototype.hasOwnProperty.call(Kt, e.name)) return Kt[e.name];
	}
	return en;
}
function gn(e) {
	return e.kind === "element" && (!e.namespace || se(e)) && Object.prototype.hasOwnProperty.call(Qt, e.name) ? Qt[e.name] : tn;
}
function rr(e) {
	return w(0, w(0, e, "&apos;", "'"), "&quot;", "\"");
}
function b(e) {
	return rr(e.value);
}
function $e(e, t) {
	return le(e, t) && !Ys.has(e.fullName);
}
function le(e, t) {
	return t.parser === "vue" && e.kind === "element" && e.parent.kind === "root" && e.fullName.toLowerCase() !== "html";
}
function Tt(e, t) {
	return le(e, t) && ($e(e, t) || e.attrMap.lang && e.attrMap.lang !== "html");
}
function _n(e) {
	let t = e.fullName;
	return t.charAt(0) === "#" || t === "slot-scope" || t === "v-slot" || t.startsWith("v-slot:");
}
function Sn(e, t) {
	let r = e.parent;
	if (!le(r, t)) return !1;
	let n = r.fullName, i = e.fullName;
	return n === "script" && i === "setup" || n === "style" && i === "vars";
}
function bt(e, t = e.value) {
	return e.parent.isWhitespaceSensitive ? e.parent.isIndentationSensitive ? L(t) : L(N.dedentString(Jt(t)), C) : B(S, N.split(t));
}
function wt(e, t) {
	return le(e, t) && e.name === "script";
}
function js(e) {
	let { valueSpan: t, value: r } = e;
	return t.end.offset - t.start.offset === r.length + 2;
}
function kt(e, t) {
	if (js(e)) return !1;
	let { value: r } = e;
	return /^PRETTIER_HTML_PLACEHOLDER_\d+_\d+_IN_JS$/u.test(r) || t.parser === "lwc" && r.startsWith("{") && r.endsWith("}");
}
async function vn(e, t, r) {
	let n = b(r.node), i = [];
	for (let [s, a] of n.split(En).entries()) if (s % 2 === 0) i.push(L(a));
	else try {
		i.push(E([
			"{{",
			A([S, await x(a, e, {
				parser: "__ng_interpolation",
				__isInHtmlInterpolation: !0
			})]),
			S,
			"}}"
		]));
	} catch {
		i.push("{{", L(a), "}}");
	}
	return i;
}
function Ks(e, t, { node: r }) {
	let n = b(r);
	return X(gt(bt(r, n.trim())), !n.includes("@@"));
}
function Zs(e) {
	let t = [];
	for (let r of e.split(";")) {
		if (r = N.trim(r), !r) continue;
		let [n, ...i] = N.split(r);
		t.push({
			name: n,
			value: i
		});
	}
	return t;
}
function Nn(e, t, r) {
	let { node: n } = r, i = yn(b(n));
	return i.length === 0 ? [""] : X(i.map(({ name: s, value: a }, o) => [[s, ...a].join(" "), o === i.length - 1 ? j(";") : [";", S]]));
}
function Ln(e) {
	return e === "	" || e === `
` || e === "\f" || e === "\r" || e === " ";
}
function sa(e) {
	let t = e.length, r, n, i, s, a, o = 0, c;
	function u(m) {
		let _, T = m.exec(e.substring(o));
		if (T) return [_] = T, o += _.length, _;
	}
	let p = [];
	for (;;) {
		if (u(ta), o >= t) {
			if (p.length === 0) throw new Error("Must contain one or more image candidate strings.");
			return p;
		}
		c = o, r = u(ra), n = [], r.slice(-1) === "," ? (r = r.replace(na, ""), g()) : d();
	}
	function d() {
		for (u(ea), i = "", s = "in descriptor";;) {
			if (a = e.charAt(o), s === "in descriptor") if (Ln(a)) i && (n.push(i), i = "", s = "after descriptor");
			else if (a === ",") {
				o += 1, i && n.push(i), g();
				return;
			} else if (a === "(") i += a, s = "in parens";
			else if (a === "") {
				i && n.push(i), g();
				return;
			} else i += a;
			else if (s === "in parens") if (a === ")") i += a, s = "in descriptor";
			else if (a === "") {
				n.push(i), g();
				return;
			} else i += a;
			else if (s === "after descriptor" && !Ln(a)) if (a === "") {
				g();
				return;
			} else s = "in descriptor", o -= 1;
			o += 1;
		}
	}
	function g() {
		let m = !1, _, T, P, z, ne = {}, Q, ot, Ce, qe, Vt;
		for (z = 0; z < n.length; z++) Q = n[z], ot = Q[Q.length - 1], Ce = Q.substring(0, Q.length - 1), qe = parseInt(Ce, 10), Vt = parseFloat(Ce), Pn.test(Ce) && ot === "w" ? ((_ || T) && (m = !0), qe === 0 ? m = !0 : _ = qe) : ia.test(Ce) && ot === "x" ? ((_ || T || P) && (m = !0), Vt < 0 ? m = !0 : T = Vt) : Pn.test(Ce) && ot === "h" ? ((P || T) && (m = !0), qe === 0 ? m = !0 : P = qe) : m = !0;
		if (!m) ne.source = {
			value: r,
			startOffset: c
		}, _ && (ne.width = { value: _ }), T && (ne.density = { value: T }), P && (ne.height = { value: P }), p.push(ne);
		else throw new Error(`Invalid srcset descriptor found in "${e}" at "${Q}".`);
	}
}
function Rn(e, t, r) {
	let i = On(b(r.node)), s = aa.filter((m) => i.some((_) => Object.prototype.hasOwnProperty.call(_, m)));
	if (s.length > 1) throw new Error("Mixed descriptor in srcset is not supported");
	let [a] = s, o = In[a], c = i.map((m) => m.source.value), u = Math.max(...c.map((m) => m.length)), p = i.map((m) => m[a] ? String(m[a].value) : ""), d = p.map((m) => {
		let _ = m.indexOf(".");
		return _ === -1 ? m.length : _;
	}), g = Math.max(...d);
	return X(B([",", S], c.map((m, _) => {
		let T = [m], P = p[_];
		if (P) {
			let z = u - m.length + 1, ne = g - d[_], Q = " ".repeat(z + ne);
			T.push(j(Q, " "), P + o);
		}
		return T;
	})));
}
function oa(e, t) {
	let { root: r } = e;
	return sr.has(r) || sr.set(r, r.children.some((n) => wt(n, t) && ["ts", "typescript"].includes(n.attrMap.lang))), sr.get(r);
}
function qn(e, t, r) {
	return x(`type T<${b(r.node)}> = any`, e, {
		parser: "babel-ts",
		__isEmbeddedTypescriptGenericParameters: !0
	}, V);
}
function Fn(e, t, r, n) {
	let i = b(r.node), s = U(r, n) ? "babel-ts" : "babel";
	return x(`function _(${i}) {}`, e, {
		parser: s,
		__isVueBindings: !0
	});
}
async function Hn(e, t, r, n) {
	let { left: s, operator: a, right: o } = la(b(r.node)), c = U(r, n);
	return [
		E(await x(`function _(${s}) {}`, e, {
			parser: c ? "babel-ts" : "babel",
			__isVueForBindingLeft: !0
		})),
		" ",
		a,
		" ",
		await x(o, e, { parser: c ? "__ts_expression" : "__js_expression" })
	];
}
function la(e) {
	let t = /(.*?)\s+(in|of)\s+(.*)/su, r = /,([^,\]}]*)(?:,([^,\]}]*))?$/u, n = /^\(|\)$/gu, i = e.match(t);
	if (!i) return;
	let s = { for: i[3].trim() };
	if (!s.for) return;
	let a = w(0, i[1].trim(), n, ""), o = a.match(r);
	o ? (s.alias = a.replace(r, ""), s.iterator1 = o[1].trim(), o[2] && (s.iterator2 = o[2].trim())) : s.alias = a;
	let c = [
		s.alias,
		s.iterator1,
		s.iterator2
	];
	if (!c.some((u, p) => !u && (p === 0 || c.slice(p + 1).some(Boolean)))) return {
		left: c.filter(Boolean).join(","),
		operator: i[2],
		right: s.for
	};
}
async function ua(e, t, r, n) {
	try {
		return await Vn(e, t, r, n);
	} catch (a) {
		if (a.cause?.code !== "BABEL_PARSER_SYNTAX_ERROR") throw a;
	}
	return x(b(r.node), e, { parser: U(r, n) ? "__vue_ts_event_binding" : "__vue_event_binding" }, V);
}
function pa(e, t, r, n) {
	return x(b(r.node), e, { parser: U(r, n) ? "__vue_ts_expression" : "__vue_expression" }, V);
}
function Vn(e, t, r, n) {
	return x(b(r.node), e, { parser: U(r, n) ? "__ts_expression" : "__js_expression" }, V);
}
function ma(e, t) {
	let { node: r } = e, { value: n } = r;
	if (n) return kt(r, t) ? [
		r.rawName,
		"=",
		n
	] : ha.find(({ test: i }) => i(e, t))?.print;
}
function fa(e) {
	return async (t, r, n, i) => {
		let s = await e(t, r, n, i);
		if (s) return s = Gt(s, (a) => typeof a == "string" ? w(0, a, "\"", "&quot;") : a), [
			n.node.rawName,
			"=\"",
			E(s),
			"\""
		];
	};
}
function Ye(e, t) {
	return [e.isSelfClosing ? "" : da(e, t), ce(e, t)];
}
function da(e, t) {
	return e.lastChild && he(e.lastChild) ? "" : [ga(e, t), xt(e, t)];
}
function ce(e, t) {
	return (e.next ? W(e.next) : pe(e.parent)) ? "" : [ue(e, t), F(e, t)];
}
function ga(e, t) {
	return pe(e) ? ue(e.lastChild, t) : "";
}
function F(e, t) {
	return he(e) ? xt(e.parent, t) : je(e) ? yt(e.next, t) : "";
}
function xt(e, t) {
	if (zn(e, t)) return "";
	switch (e.kind) {
		case "ieConditionalComment": return "<!";
		case "element": if (e.hasHtmComponentClosingTag) return "<//";
		default: return `</${e.rawName}`;
	}
}
function ue(e, t) {
	if (zn(e, t)) return "";
	switch (e.kind) {
		case "ieConditionalComment":
		case "ieConditionalEndComment": return "[endif]-->";
		case "ieConditionalStartComment": return "]><!-->";
		case "interpolation": return "}}";
		case "angularIcuExpression": return "}";
		case "element": if (e.isSelfClosing) return "/>";
		default: return ">";
	}
}
function zn(e, t) {
	return !e.isSelfClosing && !e.endSourceSpan && (oe(e) || Et(e.parent, t));
}
function W(e) {
	return e.prev && e.prev.kind !== "docType" && e.kind !== "angularControlFlowBlock" && !O(e.prev) && e.isLeadingSpaceSensitive && !e.hasLeadingSpaces;
}
function pe(e) {
	return e.lastChild?.isTrailingSpaceSensitive && !e.lastChild.hasTrailingSpaces && !O(vt(e.lastChild)) && !ae(e);
}
function he(e) {
	return !e.next && !e.hasTrailingSpaces && e.isTrailingSpaceSensitive && O(vt(e));
}
function je(e) {
	return e.next && !O(e.next) && O(e) && e.isTrailingSpaceSensitive && !e.hasTrailingSpaces;
}
function _a(e) {
	let t = e.trim().match(/^prettier-ignore-attribute(?:\s+(.+))?$/su);
	return t ? t[1] ? t[1].split(/\s+/u) : !0 : !1;
}
function Xe(e) {
	return !e.prev && e.isLeadingSpaceSensitive && !e.hasLeadingSpaces;
}
function Sa(e, t, r) {
	let { node: n } = e;
	if (!Ne(n.attrs)) return n.isSelfClosing ? " " : "";
	let i = n.prev?.kind === "comment" && _a(n.prev.value), s = typeof i == "boolean" ? () => i : Array.isArray(i) ? (d) => i.includes(d.rawName) : () => !1, a = e.map(({ node: d }) => s(d) ? L(t.originalText.slice(K(d), J(d))) : r(), "attrs"), o = n.kind === "element" && n.fullName === "script" && n.attrs.length === 1 && n.attrs[0].fullName === "src" && n.children.length === 0, u = t.singleAttributePerLine && n.attrs.length > 1 && !le(n, t) ? C : S, p = [A([o ? " " : S, B(u, a)])];
	return n.firstChild && Xe(n.firstChild) || n.isSelfClosing && pe(n.parent) || o ? p.push(n.isSelfClosing ? " " : "") : p.push(t.bracketSameLine ? n.isSelfClosing ? " " : "" : n.isSelfClosing ? S : k), p;
}
function Ea(e) {
	return e.firstChild && Xe(e.firstChild) ? "" : At(e);
}
function Ke(e, t, r) {
	let { node: n } = e;
	return [
		me(n, t),
		Sa(e, t, r),
		n.isSelfClosing ? "" : Ea(n)
	];
}
function me(e, t) {
	return e.prev && je(e.prev) ? "" : [H(e, t), yt(e, t)];
}
function H(e, t) {
	return Xe(e) ? At(e.parent) : W(e) ? ue(e.prev, t) : "";
}
function yt(e, t) {
	switch (e.kind) {
		case "ieConditionalComment":
		case "ieConditionalStartComment": return `<!--[if ${e.condition}`;
		case "ieConditionalEndComment": return "<!--<!";
		case "interpolation": return "{{";
		case "docType": {
			if (e.value === "html") {
				let { filepath: n } = t;
				if (n && /\.html?$/u.test(n)) return Gn;
			}
			let r = K(e);
			return t.originalText.slice(r, r + Gn.length);
		}
		case "angularIcuExpression": return "{";
		case "element": if (e.condition) return `<!--[if ${e.condition}]><!--><${e.rawName}`;
		default: return `<${e.rawName}`;
	}
}
function At(e) {
	switch (e.kind) {
		case "ieConditionalComment": return "]>";
		case "element": if (e.condition) return "><!--<![endif]-->";
		default: return ">";
	}
}
function Ca(e, t) {
	if (!e.endSourceSpan) return "";
	let r = e.startSourceSpan.end.offset;
	e.firstChild && Xe(e.firstChild) && (r -= At(e).length);
	let n = e.endSourceSpan.start.offset;
	return e.lastChild && he(e.lastChild) ? n += xt(e, t).length : pe(e) && (n -= ue(e.lastChild, t).length), t.originalText.slice(r, n);
}
function Ta(e, t) {
	let { node: r } = e;
	switch (r.kind) {
		case "element":
			if (q(r, t) || r.kind === "interpolation") return;
			if (!r.isSelfClosing && Tt(r, t)) {
				let n = tr(r, t);
				return n ? async (i, s) => {
					let a = Nt(r, t), o = /^\s*$/u.test(a), c = "";
					return o || (c = await i(Jt(a), {
						parser: n,
						__embeddedInHtml: !0
					}), o = c === ""), [
						H(r, t),
						E(Ke(e, t, s)),
						o ? "" : C,
						c,
						o ? "" : C,
						Ye(r, t),
						F(r, t)
					];
				} : void 0;
			}
			break;
		case "text":
			if (q(r.parent, t)) {
				let n = tr(r.parent, t);
				if (n) return async (i) => {
					let s = n === "markdown" ? N.dedentString(r.value.replace(/^[^\S\n]*\n/u, "")) : r.value, a = {
						parser: n,
						__embeddedInHtml: !0
					};
					if (t.parser === "html" && n === "babel") {
						let o = "script", { attrMap: c } = r.parent;
						c && (c.type === "module" || (c.type === "text/babel" || c.type === "text/jsx") && c["data-type"] === "module") && (o = "module"), a.__babelSourceType = o;
					}
					return [
						Y,
						H(r, t),
						await i(s, a),
						F(r, t)
					];
				};
			} else if (r.parent.kind === "interpolation") return async (n) => {
				let i = {
					__isInHtmlInterpolation: !0,
					__embeddedInHtml: !0
				};
				return t.parser === "angular" ? i.parser = "__ng_interpolation" : t.parser === "vue" ? i.parser = U(e, t) ? "__vue_ts_expression" : "__vue_expression" : i.parser = "__js_expression", [A([S, await n(r.value, i)]), r.parent.next && W(r.parent.next) ? " " : S];
			};
			break;
		case "attribute": return Wn(e, t);
		case "angularControlFlowBlockParameters": return va.has(e.parent.name) ? Yr : void 0;
		case "angularLetDeclarationInitializer": return (n) => x(r.value, n, {
			parser: "__ng_binding",
			__isInHtmlAttribute: !1
		});
	}
}
function Je(e) {
	if (Qe !== null && typeof Qe.property) {
		let t = Qe;
		return Qe = Je.prototype = null, t;
	}
	return Qe = Je.prototype = e ?? Object.create(null), new Je();
}
function ar(e) {
	return Je(e);
}
function wa(e, t = "type") {
	ar(e);
	function r(n) {
		let i = n[t], s = e[i];
		if (!Array.isArray(s)) throw Object.assign(/* @__PURE__ */ new Error(`Missing visitor keys for '${i}'.`), { node: n });
		return s;
	}
	return r;
}
function ni(e) {
	let t = J(e);
	return e.kind === "element" && !e.endSourceSpan && Ne(e.children) ? Math.max(t, ni(M(0, e.children, -1))) : t;
}
function Ze(e, t, r) {
	let n = e.node;
	if (oe(n)) {
		let i = ni(n);
		return [
			H(n, t),
			L(N.trimEnd(t.originalText.slice(K(n) + (n.prev && je(n.prev) ? yt(n).length : 0), i - (n.next && W(n.next) ? ue(n, t).length : 0)))),
			F(n, t)
		];
	}
	return r();
}
function Lt(e, t) {
	return O(e) && O(t) ? e.isTrailingSpaceSensitive ? e.hasTrailingSpaces ? Ct(t) ? C : S : "" : Ct(t) ? C : k : je(e) && (oe(t) || t.firstChild || t.isSelfClosing || t.kind === "element" && t.attrs.length > 0) || e.kind === "element" && e.isSelfClosing && W(t) ? "" : !t.isLeadingSpaceSensitive || Ct(t) || W(t) && e.lastChild && he(e.lastChild) && e.lastChild.lastChild && he(e.lastChild.lastChild) ? C : t.hasLeadingSpaces ? S : k;
}
function Le(e, t, r) {
	let { node: n } = e;
	if (er(n)) return [Y, ...e.map(() => {
		let s = e.node, a = s.prev ? Lt(s.prev, s) : "";
		return [a ? [a, Ge(s.prev) ? C : ""] : "", Ze(e, t, r)];
	}, "children")];
	let i = n.children.map(() => Symbol(""));
	return e.map(({ node: s, index: a }) => {
		if (O(s)) {
			if (s.prev && O(s.prev)) {
				let m = Lt(s.prev, s);
				if (m) return Ge(s.prev) ? [
					C,
					C,
					Ze(e, t, r)
				] : [m, Ze(e, t, r)];
			}
			return Ze(e, t, r);
		}
		let o = [], c = [], u = [], p = [], d = s.prev ? Lt(s.prev, s) : "", g = s.next ? Lt(s, s.next) : "";
		return d && (Ge(s.prev) ? o.push(C, C) : d === C ? o.push(C) : O(s.prev) ? c.push(d) : c.push(j("", k, { groupId: i[a - 1] }))), g && (Ge(s) ? O(s.next) && p.push(C, C) : g === C ? O(s.next) && p.push(C) : u.push(g)), [
			...o,
			E([...c, E([Ze(e, t, r), ...u], { id: i[a] })]),
			...p
		];
	}, "children");
}
function ii(e, t, r) {
	let { node: n } = e, i = [];
	if (Na(e) && i.push("} "), i.push("@", n.name), ya(n)) return i.push(";"), i;
	if (n.parameters && i.push(" (", E(r("parameters")), ")"), !Aa(n)) {
		i.push(" {");
		let s = si(n);
		n.children.length > 0 ? (n.firstChild.hasLeadingSpaces = !0, n.lastChild.hasTrailingSpaces = !0, i.push(A([C, Le(e, t, r)])), s && i.push(C, "}")) : s && i.push("}");
	}
	return E(i, { shouldBreak: !0 });
}
function si(e) {
	return !(e.next?.kind === "angularControlFlowBlock" && ri.get(e.name)?.has(e.next.name));
}
function Aa(e) {
	return xa(e) && e.endSourceSpan && e.endSourceSpan.start.offset === e.endSourceSpan.end.offset;
}
function Na(e) {
	let { previous: t } = e;
	return t?.kind === "angularControlFlowBlock" && !oe(t) && !si(t);
}
function ai(e, t, r) {
	return [A([k, B([";", S], e.map(r, "children"))]), k];
}
function oi(e, t, r) {
	let { node: n } = e;
	return [
		me(n, t),
		E([
			n.switchValue.trim(),
			", ",
			n.type,
			n.cases.length > 0 ? [",", A([S, B(S, e.map(r, "cases"))])] : "",
			k
		]),
		ce(n, t)
	];
}
function li(e, t, r) {
	let { node: n } = e;
	return [
		n.value,
		" {",
		E([A([k, e.map(({ node: i, isLast: s }) => {
			let a = [r()];
			return i.kind === "text" && (i.hasLeadingSpaces && a.unshift(S), i.hasTrailingSpaces && !s && a.push(S)), a;
		}, "expression")]), k]),
		"}"
	];
}
function ci(e, t, r) {
	let { node: n } = e;
	if (Et(n, t)) return [
		H(n, t),
		E(Ke(e, t, r)),
		L(Nt(n, t)),
		...Ye(n, t),
		F(n, t)
	];
	let i = n.children.length === 1 && (n.firstChild.kind === "interpolation" || n.firstChild.kind === "angularIcuExpression") && n.firstChild.isLeadingSpaceSensitive && !n.firstChild.hasLeadingSpaces && n.lastChild.isTrailingSpaceSensitive && !n.lastChild.hasTrailingSpaces, s = Symbol("element-attr-group-id"), a = (p) => E([
		E(Ke(e, t, r), { id: s }),
		p,
		Ye(n, t)
	]), o = (p) => i ? Fr(p, { groupId: s }) : (q(n, t) || $e(n, t)) && n.parent.kind === "root" && t.parser === "vue" && !t.vueIndentScriptAndStyle ? p : A(p), c = () => i ? j(k, "", { groupId: s }) : n.firstChild.hasLeadingSpaces && n.firstChild.isLeadingSpaceSensitive ? S : n.firstChild.kind === "text" && n.isWhitespaceSensitive && n.isIndentationSensitive ? qr(k) : k, u = () => (n.next ? W(n.next) : pe(n.parent)) ? n.lastChild.hasTrailingSpaces && n.lastChild.isTrailingSpaceSensitive ? " " : "" : i ? j(k, "", { groupId: s }) : n.lastChild.hasTrailingSpaces && n.lastChild.isTrailingSpaceSensitive ? S : (n.lastChild.kind === "comment" || n.lastChild.kind === "text" && n.isWhitespaceSensitive && n.isIndentationSensitive) && new RegExp(`\\n[\\t ]{${t.tabWidth * (e.ancestors.length - 1)}}$`, "u").test(n.lastChild.value) ? "" : k;
	return n.children.length === 0 ? a(n.hasDanglingSpaces && n.isDanglingSpaceSensitive ? S : "") : a([
		cn(n) ? Y : "",
		o([c(), Le(e, t, r)]),
		u()
	]);
}
function et(e, t = !0) {
	if (e[0] != ":") return [null, e];
	let r = e.indexOf(":", 1);
	if (r === -1) {
		if (t) throw new Error(`Unsupported format "${e}" expecting ":namespace:name"`);
		return [null, e];
	}
	return [e.slice(1, r), e.slice(r + 1)];
}
function or(e) {
	return et(e)[1] === "ng-container";
}
function lr(e) {
	return et(e)[1] === "ng-content";
}
function Pe(e) {
	return e === null ? null : et(e)[0];
}
function fe(e, t) {
	return e ? `:${e}:${t}` : t;
}
function ui(e) {
	return e.replace(La, (...t) => t[1].toUpperCase());
}
function pr() {
	return Pt || (Pt = {}, tt(Z.HTML, [
		"iframe|srcdoc",
		"*|innerHTML",
		"*|outerHTML"
	]), tt(Z.STYLE, ["*|style"]), tt(Z.URL, [
		"*|formAction",
		"area|href",
		"a|href",
		"a|xlink:href",
		"form|action",
		"annotation|href",
		"annotation|xlink:href",
		"annotation-xml|href",
		"annotation-xml|xlink:href",
		"maction|href",
		"maction|xlink:href",
		"malignmark|href",
		"malignmark|xlink:href",
		"math|href",
		"math|xlink:href",
		"mroot|href",
		"mroot|xlink:href",
		"msqrt|href",
		"msqrt|xlink:href",
		"merror|href",
		"merror|xlink:href",
		"mfrac|href",
		"mfrac|xlink:href",
		"mglyph|href",
		"mglyph|xlink:href",
		"msub|href",
		"msub|xlink:href",
		"msup|href",
		"msup|xlink:href",
		"msubsup|href",
		"msubsup|xlink:href",
		"mmultiscripts|href",
		"mmultiscripts|xlink:href",
		"mprescripts|href",
		"mprescripts|xlink:href",
		"mi|href",
		"mi|xlink:href",
		"mn|href",
		"mn|xlink:href",
		"mo|href",
		"mo|xlink:href",
		"mpadded|href",
		"mpadded|xlink:href",
		"mphantom|href",
		"mphantom|xlink:href",
		"mrow|href",
		"mrow|xlink:href",
		"ms|href",
		"ms|xlink:href",
		"mspace|href",
		"mspace|xlink:href",
		"mstyle|href",
		"mstyle|xlink:href",
		"mtable|href",
		"mtable|xlink:href",
		"mtd|href",
		"mtd|xlink:href",
		"mtr|href",
		"mtr|xlink:href",
		"mtext|href",
		"mtext|xlink:href",
		"mover|href",
		"mover|xlink:href",
		"munder|href",
		"munder|xlink:href",
		"munderover|href",
		"munderover|xlink:href",
		"semantics|href",
		"semantics|xlink:href",
		"none|href",
		"none|xlink:href",
		"img|src",
		"video|src"
	]), tt(Z.RESOURCE_URL, [
		"base|href",
		"embed|src",
		"frame|src",
		"iframe|src",
		"link|href",
		"object|codebase",
		"object|data",
		"script|src",
		"script|href",
		"script|xlink:href"
	]), tt(Z.ATTRIBUTE_NO_BINDING, [
		"animate|attributeName",
		"animate|values",
		"animate|to",
		"animate|from",
		"set|to",
		"set|attributeName",
		"animateMotion|attributeName",
		"animateTransform|attributeName",
		"unknown|attributeName",
		"unknown|values",
		"unknown|to",
		"unknown|from",
		"iframe|sandbox",
		"iframe|allow",
		"iframe|allowFullscreen",
		"iframe|referrerPolicy",
		"iframe|csp",
		"iframe|fetchPriority",
		"unknown|sandbox",
		"unknown|allow",
		"unknown|allowFullscreen",
		"unknown|referrerPolicy",
		"unknown|csp",
		"unknown|fetchPriority"
	])), Pt;
}
function tt(e, t) {
	for (let r of t) Pt[r.toLowerCase()] = e;
}
function Ba(e) {
	switch (e) {
		case "width":
		case "height":
		case "minWidth":
		case "minHeight":
		case "maxWidth":
		case "maxHeight":
		case "left":
		case "top":
		case "bottom":
		case "right":
		case "fontSize":
		case "outlineWidth":
		case "outlineOffset":
		case "paddingTop":
		case "paddingLeft":
		case "paddingBottom":
		case "paddingRight":
		case "marginTop":
		case "marginLeft":
		case "marginBottom":
		case "marginRight":
		case "borderRadius":
		case "borderWidth":
		case "borderTopWidth":
		case "borderLeftWidth":
		case "borderRightWidth":
		case "borderBottomWidth":
		case "textIndent": return !0;
		default: return !1;
	}
}
function Oe(e) {
	return rt || (fi = new f({ canSelfClose: !0 }), rt = Object.assign(Object.create(null), {
		base: new f({ isVoid: !0 }),
		meta: new f({ isVoid: !0 }),
		area: new f({ isVoid: !0 }),
		embed: new f({ isVoid: !0 }),
		link: new f({ isVoid: !0 }),
		img: new f({ isVoid: !0 }),
		input: new f({ isVoid: !0 }),
		param: new f({ isVoid: !0 }),
		hr: new f({ isVoid: !0 }),
		br: new f({ isVoid: !0 }),
		source: new f({ isVoid: !0 }),
		track: new f({ isVoid: !0 }),
		wbr: new f({ isVoid: !0 }),
		p: new f({
			closedByChildren: [
				"address",
				"article",
				"aside",
				"blockquote",
				"div",
				"dl",
				"fieldset",
				"footer",
				"form",
				"h1",
				"h2",
				"h3",
				"h4",
				"h5",
				"h6",
				"header",
				"hgroup",
				"hr",
				"main",
				"nav",
				"ol",
				"p",
				"pre",
				"section",
				"table",
				"ul"
			],
			closedByParent: !0
		}),
		thead: new f({ closedByChildren: ["tbody", "tfoot"] }),
		tbody: new f({
			closedByChildren: ["tbody", "tfoot"],
			closedByParent: !0
		}),
		tfoot: new f({
			closedByChildren: ["tbody"],
			closedByParent: !0
		}),
		tr: new f({
			closedByChildren: ["tr"],
			closedByParent: !0
		}),
		td: new f({
			closedByChildren: ["td", "th"],
			closedByParent: !0
		}),
		th: new f({
			closedByChildren: ["td", "th"],
			closedByParent: !0
		}),
		col: new f({ isVoid: !0 }),
		svg: new f({ implicitNamespacePrefix: "svg" }),
		foreignObject: new f({
			implicitNamespacePrefix: "svg",
			preventNamespaceInheritance: !0
		}),
		math: new f({ implicitNamespacePrefix: "math" }),
		li: new f({
			closedByChildren: ["li"],
			closedByParent: !0
		}),
		dt: new f({ closedByChildren: ["dt", "dd"] }),
		dd: new f({
			closedByChildren: ["dt", "dd"],
			closedByParent: !0
		}),
		rb: new f({
			closedByChildren: [
				"rb",
				"rt",
				"rtc",
				"rp"
			],
			closedByParent: !0
		}),
		rt: new f({
			closedByChildren: [
				"rb",
				"rt",
				"rtc",
				"rp"
			],
			closedByParent: !0
		}),
		rtc: new f({
			closedByChildren: [
				"rb",
				"rtc",
				"rp"
			],
			closedByParent: !0
		}),
		rp: new f({
			closedByChildren: [
				"rb",
				"rt",
				"rtc",
				"rp"
			],
			closedByParent: !0
		}),
		optgroup: new f({
			closedByChildren: ["optgroup"],
			closedByParent: !0
		}),
		option: new f({
			closedByChildren: ["option", "optgroup"],
			closedByParent: !0
		}),
		pre: new f({ ignoreFirstLf: !0 }),
		listing: new f({ ignoreFirstLf: !0 }),
		style: new f({ contentType: R.RAW_TEXT }),
		script: new f({ contentType: R.RAW_TEXT }),
		title: new f({ contentType: {
			default: R.ESCAPABLE_RAW_TEXT,
			svg: R.PARSABLE_DATA
		} }),
		textarea: new f({
			contentType: R.ESCAPABLE_RAW_TEXT,
			ignoreFirstLf: !0
		})
	}), new mi().allKnownElementNames().forEach((t) => {
		!rt[t] && Pe(t) === null && (rt[t] = new f({ canSelfClose: !1 }));
	})), rt[e] ?? fi;
}
function Ot(e, t, r = null) {
	let n = [], i = e.visit ? (s) => e.visit(s, r) || s.visit(e, r) : (s) => s.visit(e, r);
	return t.forEach((s) => {
		let a = i(s);
		a && n.push(a);
	}), n;
}
function it(e) {
	return e >= 9 && e <= 32 || e == 160;
}
function Ie(e) {
	return 48 <= e && e <= 57;
}
function Re(e) {
	return e >= 97 && e <= 122 || e >= 65 && e <= 90;
}
function ki(e) {
	return e >= 97 && e <= 102 || e >= 65 && e <= 70 || Ie(e);
}
function Me(e) {
	return e === 10 || e === 13;
}
function dr(e) {
	return 48 <= e && e <= 55;
}
function Dt(e) {
	return e === 39 || e === 34 || e === 96;
}
function Pi(e, t, r, n = {}) {
	let i = new Ua(new nt(e, t), r, n);
	return i.tokenize(), new qa(Xa(i.tokens), i.errors, i.nonNormalizedIcuExpressions);
}
function Se(e) {
	return `Unexpected character "${e === 0 ? "EOF" : String.fromCharCode(e)}"`;
}
function xi(e) {
	return `Unknown entity "${e}" - use the "&#<decimal>;" or  "&#x<hex>;" syntax`;
}
function Ha(e, t) {
	return `Unable to parse entity "${t}" - ${e} character reference entities must end with ";"`;
}
function v(e) {
	return !it(e) || e === 0;
}
function Ee(e) {
	return it(e) || e === 62 || e === 60 || e === 47 || e === 39 || e === 34 || e === 61 || e === 0;
}
function Wa(e) {
	return (e < 97 || 122 < e) && (e < 65 || 90 < e) && (e < 48 || e > 57);
}
function Ga(e) {
	return e === 59 || e === 0 || !ki(e);
}
function za(e) {
	return e === 59 || e === 0 || !(Re(e) || Ie(e));
}
function $a(e) {
	return e !== 125;
}
function Ya(e, t) {
	return yi(e) === yi(t);
}
function yi(e) {
	return e >= 97 && e <= 122 ? e - 97 + 65 : e;
}
function ja(e) {
	return Re(e) || Ie(e) || e === 95;
}
function Ai(e) {
	return e !== 59 && v(e);
}
function It(e) {
	return e === 95 || e >= 65 && e <= 90;
}
function Ni(e) {
	return Re(e) || Ie(e) || e === 95;
}
function Li(e) {
	return e === 47 || e === 62 || e === 60 || e === 0;
}
function Xa(e) {
	let t = [], r;
	for (let n = 0; n < e.length; n++) {
		let i = e[n];
		r && r.type === l.TEXT && i.type === l.TEXT || r && r.type === l.ATTR_VALUE_TEXT && i.type === l.ATTR_VALUE_TEXT ? (r.parts[0] += i.parts[0], r.sourceSpan.end = i.sourceSpan.end) : (r = i, t.push(r));
	}
	return t;
}
function Di(e, t) {
	return e.length > 0 && e[e.length - 1] === t;
}
function Ii(e, t) {
	return _e[t] !== void 0 ? _e[t] || e : /^#x[a-f0-9]+$/i.test(t) ? String.fromCodePoint(parseInt(t.slice(2), 16)) : /^#\d+$/.test(t) ? String.fromCodePoint(parseInt(t.slice(1), 10)) : e;
}
function Rt(e, t = {}) {
	let { canSelfClose: r = !1, allowHtmComponentClosingTags: n = !1, isTagNameCaseSensitive: i = !1, getTagContentType: s, tokenizeAngularBlocks: a = !1, tokenizeAngularLetDeclaration: o = !1, enableAngularSelectorlessSyntax: c = !1 } = t;
	return Cr ?? (Cr = new qi()), Cr.parse(e, "angular-html-parser", {
		tokenizeExpansionForms: a,
		canSelfClose: r,
		allowHtmComponentClosingTags: n,
		tokenizeBlocks: a,
		tokenizeLet: o,
		selectorlessEnabled: c
	}, i, s);
}
function eo(e, t) {
	for (let r of Za) r(e, t);
	return e;
}
function to(e) {
	e.walk((t) => {
		if (t.kind === "element" && t.tagDefinition.ignoreFirstLf && t.children.length > 0 && t.children[0].kind === "text" && t.children[0].value[0] === `
`) {
			let r = t.children[0];
			r.value.length === 1 ? t.removeChild(r) : r.value = r.value.slice(1);
		}
	});
}
function ro(e) {
	let t = (r) => r.kind === "element" && r.prev?.kind === "ieConditionalStartComment" && r.prev.sourceSpan.end.offset === r.startSourceSpan.start.offset && r.firstChild?.kind === "ieConditionalEndComment" && r.firstChild.sourceSpan.start.offset === r.startSourceSpan.end.offset;
	e.walk((r) => {
		if (r.children) for (let n = 0; n < r.children.length; n++) {
			let i = r.children[n];
			if (!t(i)) continue;
			let s = i.prev, a = i.firstChild;
			r.removeChild(s), n--;
			let o = new h(s.sourceSpan.start, a.sourceSpan.end), c = new h(o.start, i.sourceSpan.end);
			i.condition = s.condition, i.sourceSpan = c, i.startSourceSpan = o, i.removeChild(a);
		}
	});
}
function no(e, t, r) {
	e.walk((n) => {
		if (n.children) for (let i = 0; i < n.children.length; i++) {
			let s = n.children[i];
			if (s.kind !== "text" && !t(s)) continue;
			s.kind !== "text" && (s.kind = "text", s.value = r(s));
			let a = s.prev;
			!a || a.kind !== "text" || (a.value += s.value, a.sourceSpan = new h(a.sourceSpan.start, s.sourceSpan.end), n.removeChild(s), i--);
		}
	});
}
function io(e) {
	return no(e, (t) => t.kind === "cdata", (t) => `<![CDATA[${t.value}]]>`);
}
function so(e) {
	let t = (r) => r.kind === "element" && r.attrs.length === 0 && r.children.length === 1 && r.firstChild.kind === "text" && !N.hasWhitespaceCharacter(r.children[0].value) && !r.firstChild.hasLeadingSpaces && !r.firstChild.hasTrailingSpaces && r.isLeadingSpaceSensitive && !r.hasLeadingSpaces && r.isTrailingSpaceSensitive && !r.hasTrailingSpaces && r.prev?.kind === "text" && r.next?.kind === "text";
	e.walk((r) => {
		if (r.children) for (let n = 0; n < r.children.length; n++) {
			let i = r.children[n];
			if (!t(i)) continue;
			let s = i.prev, a = i.next;
			s.value += `<${i.rawName}>` + i.firstChild.value + `</${i.rawName}>` + a.value, s.sourceSpan = new h(s.sourceSpan.start, a.sourceSpan.end), s.isTrailingSpaceSensitive = a.isTrailingSpaceSensitive, s.hasTrailingSpaces = a.hasTrailingSpaces, r.removeChild(i), n--, r.removeChild(a);
		}
	});
}
function ao(e, t) {
	if (t.parser === "html") return;
	let r = /\{\{(.+?)\}\}/su;
	e.walk((n) => {
		if (nn(n, t)) for (let i of n.children) {
			if (i.kind !== "text") continue;
			let s = i.sourceSpan.start, a = null, o = i.value.split(r);
			for (let c = 0; c < o.length; c++, s = a) {
				let u = o[c];
				if (c % 2 === 0) {
					a = s.moveBy(u.length), u.length > 0 && n.insertChildBefore(i, {
						kind: "text",
						value: u,
						sourceSpan: new h(s, a)
					});
					continue;
				}
				a = s.moveBy(u.length + 4), n.insertChildBefore(i, {
					kind: "interpolation",
					sourceSpan: new h(s, a),
					children: u.length === 0 ? [] : [{
						kind: "text",
						value: u,
						sourceSpan: new h(s.moveBy(2), a.moveBy(-2))
					}]
				});
			}
			n.removeChild(i);
		}
	});
}
function oo(e, t) {
	e.walk((r) => {
		let n = r.$children;
		if (!n) return;
		if (n.length === 0 || n.length === 1 && n[0].kind === "text" && N.trim(n[0].value).length === 0) {
			r.hasDanglingSpaces = n.length > 0, r.$children = [];
			return;
		}
		let i = sn(r, t), s = Zt(r);
		if (!i) for (let a = 0; a < n.length; a++) {
			let o = n[a];
			if (o.kind !== "text") continue;
			let { leadingWhitespace: c, text: u, trailingWhitespace: p } = rn(o.value), d = o.prev, g = o.next;
			u ? (o.value = u, o.sourceSpan = new h(o.sourceSpan.start.moveBy(c.length), o.sourceSpan.end.moveBy(-p.length)), c && (d && (d.hasTrailingSpaces = !0), o.hasLeadingSpaces = !0), p && (o.hasTrailingSpaces = !0, g && (g.hasLeadingSpaces = !0))) : (r.removeChild(o), a--, (c || p) && (d && (d.hasTrailingSpaces = !0), g && (g.hasLeadingSpaces = !0)));
		}
		r.isWhitespaceSensitive = i, r.isIndentationSensitive = s;
	});
}
function lo(e) {
	e.walk((t) => {
		t.isSelfClosing = !t.children || t.kind === "element" && (t.tagDefinition.isVoid || t.endSourceSpan && t.startSourceSpan.start === t.endSourceSpan.start && t.startSourceSpan.end === t.endSourceSpan.end);
	});
}
function co(e, t) {
	e.walk((r) => {
		r.kind === "element" && (r.hasHtmComponentClosingTag = r.endSourceSpan && /^<\s*\/\s*\/\s*>$/u.test(t.originalText.slice(r.endSourceSpan.start.offset, r.endSourceSpan.end.offset)));
	});
}
function uo(e, t) {
	e.walk((r) => {
		r.cssDisplay = dn(r, t);
	});
}
function po(e, t) {
	e.walk((r) => {
		let { children: n } = r;
		if (n) {
			if (n.length === 0) {
				r.isDanglingSpaceSensitive = ln(r, t);
				return;
			}
			for (let i of n) i.isLeadingSpaceSensitive = an(i, t), i.isTrailingSpaceSensitive = on(i, t);
			for (let i = 0; i < n.length; i++) {
				let s = n[i];
				s.isLeadingSpaceSensitive = (i === 0 || s.prev.isTrailingSpaceSensitive) && s.isLeadingSpaceSensitive, s.isTrailingSpaceSensitive = (i === n.length - 1 || s.next.isLeadingSpaceSensitive) && s.isTrailingSpaceSensitive;
			}
		}
	});
}
function ho(e, t, r) {
	let { node: n } = e;
	switch (n.kind) {
		case "root": return t.__onHtmlRoot && t.__onHtmlRoot(n), [E(Le(e, t, r)), C];
		case "element":
		case "ieConditionalComment": return ci(e, t, r);
		case "angularControlFlowBlock": return ii(e, t, r);
		case "angularControlFlowBlockParameters": return ai(e, t, r);
		case "angularControlFlowBlockParameter": return N.trim(n.expression);
		case "angularLetDeclaration": return E([
			"@let ",
			E([
				n.id,
				" =",
				E(A([S, r("init")]))
			]),
			";"
		]);
		case "angularLetDeclarationInitializer": return n.value;
		case "angularIcuExpression": return oi(e, t, r);
		case "angularIcuCase": return li(e, t, r);
		case "ieConditionalStartComment":
		case "ieConditionalEndComment": return [me(n), ce(n)];
		case "interpolation": return [
			me(n, t),
			...e.map(r, "children"),
			ce(n, t)
		];
		case "text": {
			if (n.parent.kind === "interpolation") {
				let o = /\n[^\S\n]*$/u, c = o.test(n.value);
				return [L(c ? n.value.replace(o, "") : n.value), c ? C : ""];
			}
			let i = H(n, t), s = bt(n), a = F(n, t);
			return s[0] = [i, s[0]], s.push([s.pop(), a]), gt(s);
		}
		case "docType": return [E([
			me(n, t),
			" ",
			w(0, n.value.replace(/^html\b/iu, "html"), /\s+/gu, " ")
		]), ce(n, t)];
		case "comment": return [
			H(n, t),
			L(t.originalText.slice(K(n), J(n))),
			F(n, t)
		];
		case "attribute": {
			if (n.value === null) return n.rawName;
			let i = rr(n.value), s = kt(n, t) ? "" : Ur(i, "\"");
			return [
				n.rawName,
				"=",
				s,
				L(s === "\"" ? w(0, i, "\"", "&quot;") : w(0, i, "'", "&apos;")),
				s
			];
		}
		default: throw new Gr(n, "HTML");
	}
}
function go(e, t) {
	let r = /* @__PURE__ */ new SyntaxError(e + " (" + t.loc.start.line + ":" + t.loc.start.column + ")");
	return Object.assign(r, t);
}
function Mt(e) {
	return {
		..._o,
		...e
	};
}
function Tr(e) {
	let { canSelfClose: t, allowHtmComponentClosingTags: r, isTagNameCaseSensitive: n, shouldParseAsRawText: i, tokenizeAngularBlocks: s, tokenizeAngularLetDeclaration: a } = e;
	return {
		canSelfClose: t,
		allowHtmComponentClosingTags: r,
		isTagNameCaseSensitive: n,
		getTagContentType: i ? (...o) => i(...o) ? R.RAW_TEXT : void 0 : void 0,
		tokenizeAngularBlocks: s,
		tokenizeAngularLetDeclaration: a
	};
}
function So(e, t) {
	let r = e.map(t);
	return r.some((n, i) => n !== e[i]) ? r : e;
}
function Yi(e, t) {
	if (e.value) for (let { regex: r, parse: n } of Eo) {
		let i = e.value.match(r);
		if (i) return n(e, i, t);
	}
	return null;
}
function Co(e, t, r) {
	let { openingTagSuffix: n, condition: i, data: s } = t.groups, a = 4 + n.length, o = e.sourceSpan.start.moveBy(a), c = o.moveBy(s.length), [u, p] = (() => {
		try {
			return [!0, r(s, o).children];
		} catch {
			return [!1, [{
				kind: "text",
				value: s,
				sourceSpan: new h(o, c)
			}]];
		}
	})();
	return {
		kind: "ieConditionalComment",
		complete: u,
		children: p,
		condition: w(0, i.trim(), /\s+/gu, " "),
		sourceSpan: e.sourceSpan,
		startSourceSpan: new h(e.sourceSpan.start, o),
		endSourceSpan: new h(c, e.sourceSpan.end)
	};
}
function vo(e, t) {
	let { condition: r } = t.groups;
	return {
		kind: "ieConditionalStartComment",
		condition: w(0, r.trim(), /\s+/gu, " "),
		sourceSpan: e.sourceSpan
	};
}
function To(e) {
	return {
		kind: "ieConditionalEndComment",
		sourceSpan: e.sourceSpan
	};
}
function Ki(e, t, r, n) {
	Ot(new kr(), e.children, { parseOptions: r }), t && e.children.unshift(t);
	let i = new Ft(e);
	return i.walk((s) => {
		if (s.kind === "comment") {
			let a = Yi(s, n);
			a && s.parent.replaceChild(s, a);
		}
		bo(s), wo(s), ko(s);
	}), i;
}
function bo(e) {
	if (e.kind === "block") {
		if (e.name = w(0, e.name.toLowerCase(), /\s+/gu, " ").trim(), e.kind = "angularControlFlowBlock", !Ne(e.parameters)) {
			delete e.parameters;
			return;
		}
		for (let t of e.parameters) t.kind = "angularControlFlowBlockParameter";
		e.parameters = {
			kind: "angularControlFlowBlockParameters",
			children: e.parameters,
			sourceSpan: new h(e.parameters[0].sourceSpan.start, M(0, e.parameters, -1).sourceSpan.end)
		};
	}
}
function wo(e) {
	e.kind === "letDeclaration" && (e.kind = "angularLetDeclaration", e.id = e.name, e.init = {
		kind: "angularLetDeclarationInitializer",
		sourceSpan: new h(e.valueSpan.start, e.valueSpan.end),
		value: e.value
	}, delete e.name, delete e.value);
}
function ko(e) {
	e.kind === "expansion" && (e.kind = "angularIcuExpression"), e.kind === "expansionCase" && (e.kind = "angularIcuCase");
}
function ji(e, t) {
	let r = e.toLowerCase();
	return t(r) ? r : e;
}
function Xi(e) {
	let t = e.name.startsWith(":") ? e.name.slice(1).split(":")[0] : null, r = e.nameSpan.toString(), n = t !== null && r.startsWith(`${t}:`);
	e.name = n ? r.slice(t.length + 1) : r, e.namespace = t, e.hasExplicitNamespace = n;
}
function xo(e) {
	switch (e.kind) {
		case "element":
			Xi(e);
			for (let t of e.attrs) Xi(t), t.valueSpan ? (t.value = t.valueSpan.toString(), /["']/u.test(t.value[0]) && (t.value = t.value.slice(1, -1))) : t.value = null;
			break;
		case "comment":
			e.value = e.sourceSpan.toString().slice(4, -3);
			break;
		case "text":
			e.value = e.sourceSpan.toString();
			break;
	}
}
function yo(e, t) {
	if (e.kind === "element") {
		let r = Oe(t.isTagNameCaseSensitive ? e.name : e.name.toLowerCase());
		!e.namespace || e.namespace === r.implicitNamespacePrefix || se(e) ? e.tagDefinition = r : e.tagDefinition = Oe("");
	}
}
function Ao(e) {
	e.sourceSpan && e.endSourceSpan && (e.sourceSpan = new h(e.sourceSpan.start, e.endSourceSpan.end));
}
function No(e, t) {
	if (e.kind === "element" && (t.normalizeTagName && (!e.namespace || e.namespace === e.tagDefinition.implicitNamespacePrefix || se(e)) && (e.name = ji(e.name, (r) => zi.has(r))), t.normalizeAttributeName)) for (let r of e.attrs) r.namespace || (r.name = ji(r.name, (n) => Bt.has(e.name) && (Bt.get("*").has(n) || Bt.get(e.name).has(n))));
}
function yr(e, t) {
	let { rootNodes: r, errors: n } = Rt(e, Tr(t));
	return n.length > 0 && xr(n[0]), {
		parseOptions: t,
		rootNodes: r
	};
}
function Qi(e, t) {
	let r = Tr(t), { rootNodes: n, errors: i } = Rt(e, r);
	if (n.some((u) => u.kind === "docType" && u.value === "html" || u.kind === "element" && u.name.toLowerCase() === "html")) return yr(e, Ht);
	let a, o = () => a ?? (a = Rt(e, {
		...r,
		getTagContentType: void 0
	})), c = (u) => {
		let { offset: p } = u.startSourceSpan.start;
		return o().rootNodes.find((d) => d.kind === "element" && d.startSourceSpan.start.offset === p) ?? u;
	};
	for (let [u, p] of n.entries()) if (p.kind === "element") {
		if (p.isVoid) i = o().errors, n[u] = c(p);
		else if (Lo(p)) {
			let { endSourceSpan: d, startSourceSpan: g } = p, m = o().errors.find((_) => _.span.start.offset > g.start.offset && _.span.start.offset < d.end.offset);
			m && xr(m), n[u] = c(p);
		}
	}
	return i.length > 0 && xr(i[0]), {
		parseOptions: t,
		rootNodes: n
	};
}
function Lo(e) {
	if (e.kind !== "element" || e.name !== "template") return !1;
	let t = e.attrs.find((r) => r.name === "lang")?.value;
	return !t || t === "html";
}
function xr(e) {
	let { msg: t, span: { start: r, end: n } } = e;
	throw Gi(t, {
		loc: {
			start: {
				line: r.line + 1,
				column: r.col + 1
			},
			end: {
				line: n.line + 1,
				column: n.col + 1
			}
		},
		cause: e
	});
}
function Po(e, t, r, n, i, s) {
	let { offset: a } = n, c = Ar(w(0, t.slice(0, a), /[^\n]/gu, " ") + r, e, {
		...i,
		shouldParseFrontMatter: !1
	}, s);
	c.sourceSpan = new h(n, M(0, c.children, -1).sourceSpan.end);
	let u = c.children[0];
	return u.length === a ? c.children.shift() : (u.sourceSpan = new h(u.sourceSpan.start.moveBy(a), u.sourceSpan.end), u.value = u.value.slice(a)), c;
}
function Ar(e, t, r, n = {}) {
	let { frontMatter: i, content: s } = r.shouldParseFrontMatter ? Xt(e) : { content: e }, a = new nt(e, n.filepath), o = new De(a, 0, 0, 0), c = o.moveBy(e.length), { parseOptions: u, rootNodes: p } = t(s, r), d = {
		kind: "root",
		sourceSpan: new h(o, c),
		children: p
	}, g;
	if (i) {
		let [_, T] = [i.start, i.end].map((P) => new De(a, P.index, P.line - 1, P.column));
		g = {
			...i,
			kind: "frontMatter",
			sourceSpan: new h(_, T)
		};
	}
	return Ki(d, g, u, (_, T) => Po(t, e, _, T, u, n));
}
function at(e) {
	let t = Mt(e), r = t.name === "vue" ? Qi : yr;
	return {
		parse: (n, i) => Ar(n, r, t, i),
		hasPragma: Zn,
		hasIgnorePragma: ei,
		astFormat: "html",
		locStart: K,
		locEnd: J
	};
}
var Lr, Pr, Zi, Or, Ut, es, Fe, Dr, Ji, ve, ts, w, M, ss, He, Ve, Ue, lt, Te, be, ct, we, ke, xe, ye, ut, pt, $, ht, Ae, mt, ft, os, Wt, Ir, D, dt, Mr, Br, Y, S, k, C, Rr, Hr, Vr, hs, ms, Ur, $t, N, Yt, Gr, _s, Ss, $r, Yr, Cs, jr, bs, Kr, Qr, Ne, As, _t, St, ie, We, Xt, en, Kt, tn, Qt, se, Is, Jt, rn, Ys, En, Cn, nr, Xs, Tn, bn, wn, Js, kn, xn, yn, An, ea, ta, ra, na, Pn, ia, On, Dn, In, aa, Mn, Bn, sr, U, ca, ha, Wn, K, J, Gn, Nt, va, $n, Qe, ba, Yn, I, Xn, Kn, Qn, Jn, Zn, ei, ti, ri, xa, ya, R, cr, ur, Z, La, Pt, pi, Pa, Oa, Da, Ia, Ra, hi, Ma, mi, f, fi, rt, De, nt, h, di, ee, de, _i, Si, Ei, Ci, vi, te, Ti, bi, ge, G, wi, hr, mr, fr, _e, l, qa, Fa, gr, Va, st, Ua, Oi, Ka, Er, y, Qa, Mi, Ja, qi, Cr, Za, Fi, Hi, Vi, vr, Ui, Wi, Nr, Gi, _o, Bt, zi, qt, $i, re, br, wr, Be, Ft, Eo, kr, Ht, Oo, Do, Io, Ro, Mo, Bo, qo;
//#endregion
__esmMin((() => {
	Lr = Object.defineProperty;
	Pr = (e) => {
		throw TypeError(e);
	};
	Zi = (e, t, r) => t in e ? Lr(e, t, {
		enumerable: !0,
		configurable: !0,
		writable: !0,
		value: r
	}) : e[t] = r;
	Or = (e, t) => {
		for (var r in t) Lr(e, r, {
			get: t[r],
			enumerable: !0
		});
	};
	Ut = (e, t, r) => Zi(e, typeof t != "symbol" ? t + "" : t, r), es = (e, t, r) => t.has(e) || Pr("Cannot " + r);
	Fe = (e, t, r) => (es(e, t, "read from private field"), r ? r.call(e) : t.get(e)), Dr = (e, t, r) => t.has(e) ? Pr("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r);
	Ji = {};
	Or(Ji, {
		languages: () => Vi,
		options: () => Wi,
		parsers: () => Nr,
		printers: () => qo
	});
	ve = (e, t) => (r, n, ...i) => r | 1 && n == null ? void 0 : (t.call(n) ?? n[e]).apply(n, i);
	ts = String.prototype.replaceAll ?? function(e, t) {
		return e.global ? this.replace(e, t) : this.split(e).join(t);
	}, w = ve("replaceAll", function() {
		if (typeof this == "string") return ts;
	});
	M = ve("at", function() {
		if (Array.isArray(this) || typeof this == "string") return ns;
	});
	ss = () => {}, He = ss;
	Ve = "string", Ue = "array", lt = "cursor", Te = "indent", be = "align", ct = "trim", we = "group", ke = "fill", xe = "if-break", ye = "indent-if-break", ut = "line-suffix", pt = "line-suffix-boundary", $ = "line", ht = "label", Ae = "break-parent", mt = new Set([
		lt,
		Te,
		be,
		ct,
		we,
		ke,
		xe,
		ye,
		ut,
		pt,
		$,
		ht,
		Ae
	]);
	ft = as;
	os = (e) => new Intl.ListFormat("en-US", { type: "disjunction" }).format(e);
	Wt = class extends Error {
		name = "InvalidDocError";
		constructor(t) {
			super(ls(t)), this.doc = t;
		}
	}, Ir = Wt;
	D = He, dt = He, Mr = He, Br = He;
	Y = { type: Ae };
	S = { type: $ }, k = {
		type: $,
		soft: !0
	}, C = [{
		type: $,
		hard: !0
	}, Y], Rr = [{
		type: $,
		hard: !0,
		literal: !0
	}, Y];
	Hr = Object.freeze({
		character: "'",
		codePoint: 39
	}), Vr = Object.freeze({
		character: "\"",
		codePoint: 34
	}), hs = Object.freeze({
		preferred: Hr,
		alternate: Vr
	}), ms = Object.freeze({
		preferred: Vr,
		alternate: Hr
	});
	Ur = fs;
	$t = class {
		#e;
		constructor(t) {
			this.#e = new Set(t);
		}
		getLeadingWhitespaceCount(t) {
			let r = this.#e, n = 0;
			for (let i = 0; i < t.length && r.has(t.charAt(i)); i++) n++;
			return n;
		}
		getTrailingWhitespaceCount(t) {
			let r = this.#e, n = 0;
			for (let i = t.length - 1; i >= 0 && r.has(t.charAt(i)); i--) n++;
			return n;
		}
		getLeadingWhitespace(t) {
			let r = this.getLeadingWhitespaceCount(t);
			return t.slice(0, r);
		}
		getTrailingWhitespace(t) {
			let r = this.getTrailingWhitespaceCount(t);
			return t.slice(t.length - r);
		}
		hasLeadingWhitespace(t) {
			return this.#e.has(t.charAt(0));
		}
		hasTrailingWhitespace(t) {
			return this.#e.has(M(0, t, -1));
		}
		trimStart(t) {
			let r = this.getLeadingWhitespaceCount(t);
			return t.slice(r);
		}
		trimEnd(t) {
			let r = this.getTrailingWhitespaceCount(t);
			return t.slice(0, t.length - r);
		}
		trim(t) {
			return this.trimEnd(this.trimStart(t));
		}
		split(t, r = !1) {
			let n = `[${zt([...this.#e].join(""))}]+`, i = new RegExp(r ? `(${n})` : n, "u");
			return t.split(i);
		}
		hasWhitespaceCharacter(t) {
			let r = this.#e;
			return Array.prototype.some.call(t, (n) => r.has(n));
		}
		hasNonWhitespaceCharacter(t) {
			let r = this.#e;
			return Array.prototype.some.call(t, (n) => !r.has(n));
		}
		isWhitespaceOnly(t) {
			let r = this.#e;
			return Array.prototype.every.call(t, (n) => r.has(n));
		}
		#t(t) {
			let r = Number.POSITIVE_INFINITY;
			for (let n of t.split(`
`)) {
				if (n.length === 0) continue;
				let i = this.getLeadingWhitespaceCount(n);
				if (i === 0) return 0;
				n.length !== i && i < r && (r = i);
			}
			return r === Number.POSITIVE_INFINITY ? 0 : r;
		}
		dedentString(t) {
			let r = this.#t(t);
			return r === 0 ? t : t.split(`
`).map((n) => n.slice(r)).join(`
`);
		}
	};
	N = new $t([
		"	",
		`
`,
		"\f",
		"\r",
		" "
	]);
	Yt = class extends Error {
		name = "UnexpectedNodeError";
		constructor(t, r, n = "type") {
			super(`Unexpected ${r} node ${n}: ${JSON.stringify(t[n])}.`), this.node = t;
		}
	}, Gr = Yt;
	_s = new Set([
		"sourceSpan",
		"startSourceSpan",
		"endSourceSpan",
		"nameSpan",
		"valueSpan",
		"keySpan",
		"tagDefinition",
		"tokens",
		"valueTokens",
		"switchValueSourceSpan",
		"expSourceSpan",
		"valueSourceSpan"
	]), Ss = new Set([
		"if",
		"else if",
		"for",
		"switch",
		"case"
	]);
	zr.ignoredProperties = _s;
	$r = zr;
	Yr = Es;
	Cs = Array.prototype.toReversed ?? function() {
		return [...this].reverse();
	}, jr = ve("toReversed", function() {
		if (Array.isArray(this)) return Cs;
	});
	bs = Ts();
	Kr = (e) => String(e).split(/[/\\]/u).pop(), Qr = (e) => String(e).startsWith("file:");
	Ne = xs;
	As = void 0;
	_t = Ns;
	St = Symbol.for("PRETTIER_IS_FRONT_MATTER");
	ie = Ls;
	We = 3;
	Xt = Os;
	en = "inline", Kt = {
		area: "none",
		base: "none",
		basefont: "none",
		datalist: "none",
		head: "none",
		link: "none",
		meta: "none",
		noembed: "none",
		noframes: "none",
		param: "block",
		rp: "none",
		script: "block",
		style: "none",
		template: "inline",
		title: "none",
		html: "block",
		body: "block",
		address: "block",
		blockquote: "block",
		center: "block",
		dialog: "block",
		div: "block",
		figure: "block",
		figcaption: "block",
		footer: "block",
		form: "block",
		header: "block",
		hr: "block",
		legend: "block",
		listing: "block",
		main: "block",
		p: "block",
		plaintext: "block",
		pre: "block",
		search: "block",
		xmp: "block",
		slot: "contents",
		ruby: "ruby",
		rt: "ruby-text",
		article: "block",
		aside: "block",
		h1: "block",
		h2: "block",
		h3: "block",
		h4: "block",
		h5: "block",
		h6: "block",
		hgroup: "block",
		nav: "block",
		section: "block",
		dir: "block",
		dd: "block",
		dl: "block",
		dt: "block",
		menu: "block",
		ol: "block",
		ul: "block",
		li: "list-item",
		table: "table",
		caption: "table-caption",
		colgroup: "table-column-group",
		col: "table-column",
		thead: "table-header-group",
		tbody: "table-row-group",
		tfoot: "table-footer-group",
		tr: "table-row",
		td: "table-cell",
		th: "table-cell",
		input: "inline-block",
		button: "inline-block",
		fieldset: "block",
		details: "block",
		summary: "block",
		marquee: "inline-block",
		select: "inline-block",
		source: "block",
		track: "block",
		meter: "inline-block",
		progress: "inline-block",
		object: "inline-block",
		video: "inline-block",
		audio: "inline-block",
		option: "block",
		optgroup: "block"
	}, tn = "normal", Qt = {
		listing: "pre",
		plaintext: "pre",
		pre: "pre",
		xmp: "pre",
		nobr: "nowrap",
		table: "initial",
		textarea: "pre-wrap"
	};
	se = Ds;
	Is = (e) => w(0, e, /^[\t\f\r ]*\n/gu, ""), Jt = (e) => Is(N.trimEnd(e)), rn = (e) => {
		let t = e, r = N.getLeadingWhitespace(t);
		r && (t = t.slice(r.length));
		let n = N.getTrailingWhitespace(t);
		return n && (t = t.slice(0, -n.length)), {
			leadingWhitespace: r,
			trailingWhitespace: n,
			text: t
		};
	};
	Ys = new Set([
		"template",
		"style",
		"script"
	]);
	En = /\{\{(.+?)\}\}/su, Cn = ({ node: { value: e } }) => En.test(e);
	nr = (e) => (t, r, n) => x(b(n.node), t, { parser: e }, V), Xs = [
		{
			test(e) {
				let t = e.node.fullName;
				return t.startsWith("(") && t.endsWith(")") || t.startsWith("on-");
			},
			print: nr("__ng_action")
		},
		{
			test(e) {
				let t = e.node.fullName;
				return t.startsWith("[") && t.endsWith("]") || /^bind(?:on)?-/u.test(t) || /^ng-(?:if|show|hide|class|style)$/u.test(t);
			},
			print: nr("__ng_binding")
		},
		{
			test: (e) => e.node.fullName.startsWith("*"),
			print: nr("__ng_directive")
		},
		{
			test: (e) => /^i18n(?:-.+)?$/u.test(e.node.fullName),
			print: Ks
		},
		{
			test: Cn,
			print: vn
		}
	].map(({ test: e, print: t }) => ({
		test: (r, n) => n.parser === "angular" && e(r),
		print: t
	}));
	Tn = Xs;
	bn = ({ node: e }, t) => !t.parentParser && e.fullName === "class" && !e.value.includes("{{"), wn = (e, t, r) => b(r.node).trim().split(/\s+/u).join(" ");
	Js = new Set([
		"onabort",
		"onafterprint",
		"onauxclick",
		"onbeforeinput",
		"onbeforematch",
		"onbeforeprint",
		"onbeforetoggle",
		"onbeforeunload",
		"onblur",
		"oncancel",
		"oncanplay",
		"oncanplaythrough",
		"onchange",
		"onclick",
		"onclose",
		"oncommand",
		"oncontextlost",
		"oncontextmenu",
		"oncontextrestored",
		"oncopy",
		"oncuechange",
		"oncut",
		"ondblclick",
		"ondrag",
		"ondragend",
		"ondragenter",
		"ondragleave",
		"ondragover",
		"ondragstart",
		"ondrop",
		"ondurationchange",
		"onemptied",
		"onended",
		"onerror",
		"onfocus",
		"onformdata",
		"onhashchange",
		"oninput",
		"oninvalid",
		"onkeydown",
		"onkeypress",
		"onkeyup",
		"onlanguagechange",
		"onload",
		"onloadeddata",
		"onloadedmetadata",
		"onloadstart",
		"onmessage",
		"onmessageerror",
		"onmousedown",
		"onmouseenter",
		"onmouseleave",
		"onmousemove",
		"onmouseout",
		"onmouseover",
		"onmouseup",
		"onoffline",
		"ononline",
		"onpagehide",
		"onpagereveal",
		"onpageshow",
		"onpageswap",
		"onpaste",
		"onpause",
		"onplay",
		"onplaying",
		"onpopstate",
		"onprogress",
		"onratechange",
		"onrejectionhandled",
		"onreset",
		"onresize",
		"onscroll",
		"onscrollend",
		"onsecuritypolicyviolation",
		"onseeked",
		"onseeking",
		"onselect",
		"onslotchange",
		"onstalled",
		"onstorage",
		"onsubmit",
		"onsuspend",
		"ontimeupdate",
		"ontoggle",
		"onunhandledrejection",
		"onunload",
		"onvolumechange",
		"onwaiting",
		"onwheel"
	]), kn = ({ node: e }, t) => Js.has(e.fullName) && !t.parentParser && !e.value.includes("{{"), xn = (e, t, r) => x(b(r.node), e, {
		parser: "babel",
		__isHtmlInlineEventHandler: !0
	}, () => !1);
	yn = Zs;
	An = ({ node: e }, t) => e.fullName === "allow" && !t.parentParser && e.parent.fullName === "iframe" && !e.value.includes("{{");
	ea = /^[ \t\n\r\u000c]+/, ta = /^[, \t\n\r\u000c]+/, ra = /^[^ \t\n\r\u000c]+/, na = /[,]+$/, Pn = /^\d+$/, ia = /^-?(?:[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;
	On = sa;
	Dn = (e) => e.node.fullName === "srcset" && (e.parent.fullName === "img" || e.parent.fullName === "source"), In = {
		width: "w",
		height: "h",
		density: "x"
	}, aa = Object.keys(In);
	Mn = ({ node: e }, t) => e.fullName === "style" && !t.parentParser && !e.value.includes("{{"), Bn = async (e, t, r) => X(await e(b(r.node), {
		parser: "css",
		__isHTMLStyleAttribute: !0
	}));
	sr = /* @__PURE__ */ new WeakMap();
	U = oa;
	ca = [
		{
			test: (e) => e.node.fullName === "v-for",
			print: Hn
		},
		{
			test: (e, t) => e.node.fullName === "generic" && wt(e.parent, t),
			print: qn
		},
		{
			test: ({ node: e }, t) => _n(e) || Sn(e, t),
			print: Fn
		},
		{
			test(e) {
				let t = e.node.fullName;
				return t.startsWith("@") || t.startsWith("v-on:");
			},
			print: ua
		},
		{
			test(e) {
				let t = e.node.fullName;
				return t.startsWith(":") || t.startsWith(".") || t.startsWith("v-bind:");
			},
			print: pa
		},
		{
			test: (e) => e.node.fullName.startsWith("v-"),
			print: Vn
		}
	].map(({ test: e, print: t }) => ({
		test: (r, n) => n.parser === "vue" && e(r, n),
		print: t
	}));
	ha = [
		{
			test: Dn,
			print: Rn
		},
		{
			test: Mn,
			print: Bn
		},
		{
			test: kn,
			print: xn
		},
		{
			test: bn,
			print: wn
		},
		{
			test: An,
			print: Nn
		},
		...ca,
		...Tn
	].map(({ test: e, print: t }) => ({
		test: e,
		print: fa(t)
	}));
	Wn = ma;
	K = (e) => e.sourceSpan.start.offset, J = (e) => e.sourceSpan.end.offset;
	Gn = "<!doctype";
	Nt = Ca;
	va = new Set([
		"if",
		"else if",
		"for",
		"switch",
		"case"
	]);
	$n = Ta;
	Qe = null;
	ba = 10;
	for (let e = 0; e <= ba; e++) Je();
	Yn = wa;
	I = [["children"], []];
	Xn = Yn({
		root: I[0],
		element: ["attrs", "children"],
		ieConditionalComment: I[0],
		ieConditionalStartComment: I[1],
		ieConditionalEndComment: I[1],
		interpolation: I[0],
		text: I[0],
		docType: I[1],
		comment: I[1],
		attribute: I[1],
		cdata: I[1],
		angularControlFlowBlock: ["children", "parameters"],
		angularControlFlowBlockParameters: I[0],
		angularControlFlowBlockParameter: I[1],
		angularLetDeclaration: ["init"],
		angularLetDeclarationInitializer: I[1],
		angularIcuExpression: ["cases"],
		angularIcuCase: ["expression"]
	}, "kind");
	Kn = "format";
	Qn = /^\s*<!--\s*@(?:noformat|noprettier)\s*-->/u, Jn = /^\s*<!--\s*@(?:format|prettier)\s*-->/u;
	Zn = (e) => Jn.test(e), ei = (e) => Qn.test(e), ti = (e) => `<!-- @${Kn} -->

${e}`;
	ri = new Map([
		["if", new Set(["else if", "else"])],
		["else if", new Set(["else if", "else"])],
		["for", new Set(["empty"])],
		["defer", new Set([
			"placeholder",
			"error",
			"loading"
		])],
		["placeholder", new Set([
			"placeholder",
			"error",
			"loading"
		])],
		["error", new Set([
			"placeholder",
			"error",
			"loading"
		])],
		["loading", new Set([
			"placeholder",
			"error",
			"loading"
		])]
	]);
	xa = (e) => e?.kind === "angularControlFlowBlock" && (e.name === "case" || e.name === "default"), ya = (e) => e?.kind === "angularControlFlowBlock" && e.name === "default never";
	R = (function(e) {
		return e[e.RAW_TEXT = 0] = "RAW_TEXT", e[e.ESCAPABLE_RAW_TEXT = 1] = "ESCAPABLE_RAW_TEXT", e[e.PARSABLE_DATA = 2] = "PARSABLE_DATA", e;
	})({});
	cr = { name: "custom-elements" }, ur = { name: "no-errors-schema" }, Z = (function(e) {
		return e[e.NONE = 0] = "NONE", e[e.HTML = 1] = "HTML", e[e.STYLE = 2] = "STYLE", e[e.SCRIPT = 3] = "SCRIPT", e[e.URL = 4] = "URL", e[e.RESOURCE_URL = 5] = "RESOURCE_URL", e[e.ATTRIBUTE_NO_BINDING = 6] = "ATTRIBUTE_NO_BINDING", e;
	})({});
	La = /-+([a-z0-9])/g;
	pi = class {};
	Pa = "boolean", Oa = "number", Da = "string", Ia = "object", Ra = [
		"[Element]|textContent,%ariaActiveDescendantElement,%ariaAtomic,%ariaAutoComplete,%ariaBusy,%ariaChecked,%ariaColCount,%ariaColIndex,%ariaColIndexText,%ariaColSpan,%ariaControlsElements,%ariaCurrent,%ariaDescribedByElements,%ariaDescription,%ariaDetailsElements,%ariaDisabled,%ariaErrorMessageElements,%ariaExpanded,%ariaFlowToElements,%ariaHasPopup,%ariaHidden,%ariaInvalid,%ariaKeyShortcuts,%ariaLabel,%ariaLabelledByElements,%ariaLevel,%ariaLive,%ariaModal,%ariaMultiLine,%ariaMultiSelectable,%ariaOrientation,%ariaOwnsElements,%ariaPlaceholder,%ariaPosInSet,%ariaPressed,%ariaReadOnly,%ariaRelevant,%ariaRequired,%ariaRoleDescription,%ariaRowCount,%ariaRowIndex,%ariaRowIndexText,%ariaRowSpan,%ariaSelected,%ariaSetSize,%ariaSort,%ariaValueMax,%ariaValueMin,%ariaValueNow,%ariaValueText,%classList,className,elementTiming,id,innerHTML,*beforecopy,*beforecut,*beforepaste,*fullscreenchange,*fullscreenerror,*search,*webkitfullscreenchange,*webkitfullscreenerror,outerHTML,%part,#scrollLeft,#scrollTop,slot,*message,*mozfullscreenchange,*mozfullscreenerror,*mozpointerlockchange,*mozpointerlockerror,*webglcontextcreationerror,*webglcontextlost,*webglcontextrestored",
		"[HTMLElement]^[Element]|accessKey,autocapitalize,!autofocus,contentEditable,dir,!draggable,enterKeyHint,!hidden,!inert,innerText,inputMode,lang,nonce,*abort,*animationend,*animationiteration,*animationstart,*auxclick,*beforexrselect,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contextmenu,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*formdata,*gotpointercapture,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*lostpointercapture,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*paste,*pause,*play,*playing,*pointercancel,*pointerdown,*pointerenter,*pointerleave,*pointermove,*pointerout,*pointerover,*pointerrawupdate,*pointerup,*progress,*ratechange,*reset,*resize,*scroll,*securitypolicyviolation,*seeked,*seeking,*select,*selectionchange,*selectstart,*slotchange,*stalled,*submit,*suspend,*timeupdate,*toggle,*transitioncancel,*transitionend,*transitionrun,*transitionstart,*volumechange,*waiting,*webkitanimationend,*webkitanimationiteration,*webkitanimationstart,*webkittransitionend,*wheel,outerText,!spellcheck,%style,#tabIndex,title,!translate,virtualKeyboardPolicy",
		"abbr,address,article,aside,b,bdi,bdo,cite,content,code,dd,dfn,dt,em,figcaption,figure,footer,header,hgroup,i,kbd,main,mark,nav,noscript,rb,rp,rt,rtc,ruby,s,samp,search,section,small,strong,sub,sup,u,var,wbr^[HTMLElement]|accessKey,autocapitalize,!autofocus,contentEditable,dir,!draggable,enterKeyHint,!hidden,innerText,inputMode,lang,nonce,*abort,*animationend,*animationiteration,*animationstart,*auxclick,*beforexrselect,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contextmenu,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*formdata,*gotpointercapture,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*lostpointercapture,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*paste,*pause,*play,*playing,*pointercancel,*pointerdown,*pointerenter,*pointerleave,*pointermove,*pointerout,*pointerover,*pointerrawupdate,*pointerup,*progress,*ratechange,*reset,*resize,*scroll,*securitypolicyviolation,*seeked,*seeking,*select,*selectionchange,*selectstart,*slotchange,*stalled,*submit,*suspend,*timeupdate,*toggle,*transitioncancel,*transitionend,*transitionrun,*transitionstart,*volumechange,*waiting,*webkitanimationend,*webkitanimationiteration,*webkitanimationstart,*webkittransitionend,*wheel,outerText,!spellcheck,%style,#tabIndex,title,!translate,virtualKeyboardPolicy",
		"media^[HTMLElement]|!autoplay,!controls,%controlsList,%crossOrigin,#currentTime,!defaultMuted,#defaultPlaybackRate,!disableRemotePlayback,!loop,!muted,*encrypted,*waitingforkey,#playbackRate,preload,!preservesPitch,src,%srcObject,#volume",
		":svg:^[HTMLElement]|!autofocus,nonce,*abort,*animationend,*animationiteration,*animationstart,*auxclick,*beforexrselect,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contextmenu,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*formdata,*gotpointercapture,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*lostpointercapture,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*paste,*pause,*play,*playing,*pointercancel,*pointerdown,*pointerenter,*pointerleave,*pointermove,*pointerout,*pointerover,*pointerrawupdate,*pointerup,*progress,*ratechange,*reset,*resize,*scroll,*securitypolicyviolation,*seeked,*seeking,*select,*selectionchange,*selectstart,*slotchange,*stalled,*submit,*suspend,*timeupdate,*toggle,*transitioncancel,*transitionend,*transitionrun,*transitionstart,*volumechange,*waiting,*webkitanimationend,*webkitanimationiteration,*webkitanimationstart,*webkittransitionend,*wheel,%style,#tabIndex",
		":svg:graphics^:svg:|",
		":svg:animation^:svg:|*begin,*end,*repeat",
		":svg:geometry^:svg:|",
		":svg:componentTransferFunction^:svg:|",
		":svg:gradient^:svg:|",
		":svg:textContent^:svg:graphics|",
		":svg:textPositioning^:svg:textContent|",
		"a^[HTMLElement]|charset,coords,download,hash,host,hostname,href,hreflang,name,password,pathname,ping,port,protocol,referrerPolicy,rel,%relList,rev,search,shape,target,text,type,username",
		"area^[HTMLElement]|alt,coords,download,hash,host,hostname,href,!noHref,password,pathname,ping,port,protocol,referrerPolicy,rel,%relList,search,shape,target,username",
		"audio^media|",
		"br^[HTMLElement]|clear",
		"base^[HTMLElement]|href,target",
		"body^[HTMLElement]|aLink,background,bgColor,link,*afterprint,*beforeprint,*beforeunload,*blur,*error,*focus,*hashchange,*languagechange,*load,*message,*messageerror,*offline,*online,*pagehide,*pageshow,*popstate,*rejectionhandled,*resize,*scroll,*storage,*unhandledrejection,*unload,text,vLink",
		"button^[HTMLElement]|!disabled,formAction,formEnctype,formMethod,!formNoValidate,formTarget,name,type,value",
		"canvas^[HTMLElement]|#height,#width",
		"content^[HTMLElement]|select",
		"dl^[HTMLElement]|!compact",
		"data^[HTMLElement]|value",
		"datalist^[HTMLElement]|",
		"details^[HTMLElement]|!open",
		"dialog^[HTMLElement]|!open,returnValue",
		"dir^[HTMLElement]|!compact",
		"div^[HTMLElement]|align",
		"embed^[HTMLElement]|align,height,name,src,type,width",
		"fieldset^[HTMLElement]|!disabled,name",
		"font^[HTMLElement]|color,face,size",
		"form^[HTMLElement]|acceptCharset,action,autocomplete,encoding,enctype,method,name,!noValidate,target",
		"frame^[HTMLElement]|frameBorder,longDesc,marginHeight,marginWidth,name,!noResize,scrolling,src",
		"frameset^[HTMLElement]|cols,*afterprint,*beforeprint,*beforeunload,*blur,*error,*focus,*hashchange,*languagechange,*load,*message,*messageerror,*offline,*online,*pagehide,*pageshow,*popstate,*rejectionhandled,*resize,*scroll,*storage,*unhandledrejection,*unload,rows",
		"geolocation^[HTMLElement]|accuracymode,!autolocate,*location,*promptaction,*promptdismiss,*validationstatuschange,!watch",
		"hr^[HTMLElement]|align,color,!noShade,size,width",
		"head^[HTMLElement]|",
		"h1,h2,h3,h4,h5,h6^[HTMLElement]|align",
		"html^[HTMLElement]|version",
		"iframe^[HTMLElement]|align,allow,!allowFullscreen,!allowPaymentRequest,csp,frameBorder,height,loading,longDesc,marginHeight,marginWidth,name,referrerPolicy,%sandbox,scrolling,src,srcdoc,width",
		"img^[HTMLElement]|align,alt,border,%crossOrigin,decoding,#height,#hspace,!isMap,loading,longDesc,lowsrc,name,referrerPolicy,sizes,src,srcset,useMap,#vspace,#width",
		"input^[HTMLElement]|accept,align,alt,autocomplete,!checked,!defaultChecked,defaultValue,dirName,!disabled,%files,formAction,formEnctype,formMethod,!formNoValidate,formTarget,#height,!incremental,!indeterminate,max,#maxLength,min,#minLength,!multiple,name,pattern,placeholder,!readOnly,!required,selectionDirection,#selectionEnd,#selectionStart,#size,src,step,type,useMap,value,%valueAsDate,#valueAsNumber,#width",
		"li^[HTMLElement]|type,#value",
		"label^[HTMLElement]|htmlFor",
		"legend^[HTMLElement]|align",
		"link^[HTMLElement]|as,charset,%crossOrigin,!disabled,href,hreflang,imageSizes,imageSrcset,integrity,media,referrerPolicy,rel,%relList,rev,%sizes,target,type",
		"map^[HTMLElement]|name",
		"marquee^[HTMLElement]|behavior,bgColor,direction,height,#hspace,#loop,#scrollAmount,#scrollDelay,!trueSpeed,#vspace,width",
		"menu^[HTMLElement]|!compact",
		"meta^[HTMLElement]|content,httpEquiv,media,name,scheme",
		"meter^[HTMLElement]|#high,#low,#max,#min,#optimum,#value",
		"ins,del^[HTMLElement]|cite,dateTime",
		"ol^[HTMLElement]|!compact,!reversed,#start,type",
		"object^[HTMLElement]|align,archive,border,code,codeBase,codeType,data,!declare,height,#hspace,name,standby,type,useMap,#vspace,width",
		"optgroup^[HTMLElement]|!disabled,label",
		"option^[HTMLElement]|!defaultSelected,!disabled,label,!selected,text,value",
		"output^[HTMLElement]|defaultValue,%htmlFor,name,value",
		"p^[HTMLElement]|align",
		"param^[HTMLElement]|name,type,value,valueType",
		"picture^[HTMLElement]|",
		"pre^[HTMLElement]|#width",
		"progress^[HTMLElement]|#max,#value",
		"q,blockquote,cite^[HTMLElement]|",
		"script^[HTMLElement]|!async,charset,%crossOrigin,!defer,event,htmlFor,integrity,!noModule,%referrerPolicy,src,text,type",
		"select^[HTMLElement]|autocomplete,!disabled,#length,!multiple,name,!required,#selectedIndex,#size,value",
		"selectedcontent^[HTMLElement]|",
		"slot^[HTMLElement]|name",
		"source^[HTMLElement]|#height,media,sizes,src,srcset,type,#width",
		"span^[HTMLElement]|",
		"style^[HTMLElement]|!disabled,media,type",
		"search^[HTMLELement]|",
		"caption^[HTMLElement]|align",
		"th,td^[HTMLElement]|abbr,align,axis,bgColor,ch,chOff,#colSpan,headers,height,!noWrap,#rowSpan,scope,vAlign,width",
		"col,colgroup^[HTMLElement]|align,ch,chOff,#span,vAlign,width",
		"table^[HTMLElement]|align,bgColor,border,%caption,cellPadding,cellSpacing,frame,rules,summary,%tFoot,%tHead,width",
		"tr^[HTMLElement]|align,bgColor,ch,chOff,vAlign",
		"tfoot,thead,tbody^[HTMLElement]|align,ch,chOff,vAlign",
		"template^[HTMLElement]|",
		"textarea^[HTMLElement]|autocomplete,#cols,defaultValue,dirName,!disabled,#maxLength,#minLength,name,placeholder,!readOnly,!required,#rows,selectionDirection,#selectionEnd,#selectionStart,value,wrap",
		"time^[HTMLElement]|dateTime",
		"title^[HTMLElement]|text",
		"track^[HTMLElement]|!default,kind,label,src,srclang",
		"ul^[HTMLElement]|!compact,type",
		"unknown^[HTMLElement]|",
		"video^media|!disablePictureInPicture,#height,*enterpictureinpicture,*leavepictureinpicture,!playsInline,poster,#width",
		":svg:a^:svg:graphics|",
		":svg:animate^:svg:animation|",
		":svg:animateMotion^:svg:animation|",
		":svg:animateTransform^:svg:animation|",
		":svg:circle^:svg:geometry|",
		":svg:clipPath^:svg:graphics|",
		":svg:defs^:svg:graphics|",
		":svg:desc^:svg:|",
		":svg:discard^:svg:|",
		":svg:ellipse^:svg:geometry|",
		":svg:feBlend^:svg:|",
		":svg:feColorMatrix^:svg:|",
		":svg:feComponentTransfer^:svg:|",
		":svg:feComposite^:svg:|",
		":svg:feConvolveMatrix^:svg:|",
		":svg:feDiffuseLighting^:svg:|",
		":svg:feDisplacementMap^:svg:|",
		":svg:feDistantLight^:svg:|",
		":svg:feDropShadow^:svg:|",
		":svg:feFlood^:svg:|",
		":svg:feFuncA^:svg:componentTransferFunction|",
		":svg:feFuncB^:svg:componentTransferFunction|",
		":svg:feFuncG^:svg:componentTransferFunction|",
		":svg:feFuncR^:svg:componentTransferFunction|",
		":svg:feGaussianBlur^:svg:|",
		":svg:feImage^:svg:|",
		":svg:feMerge^:svg:|",
		":svg:feMergeNode^:svg:|",
		":svg:feMorphology^:svg:|",
		":svg:feOffset^:svg:|",
		":svg:fePointLight^:svg:|",
		":svg:feSpecularLighting^:svg:|",
		":svg:feSpotLight^:svg:|",
		":svg:feTile^:svg:|",
		":svg:feTurbulence^:svg:|",
		":svg:filter^:svg:|",
		":svg:foreignObject^:svg:graphics|",
		":svg:g^:svg:graphics|",
		":svg:image^:svg:graphics|decoding",
		":svg:line^:svg:geometry|",
		":svg:linearGradient^:svg:gradient|",
		":svg:mpath^:svg:|",
		":svg:marker^:svg:|",
		":svg:mask^:svg:|",
		":svg:metadata^:svg:|",
		":svg:path^:svg:geometry|",
		":svg:pattern^:svg:|",
		":svg:polygon^:svg:geometry|",
		":svg:polyline^:svg:geometry|",
		":svg:radialGradient^:svg:gradient|",
		":svg:rect^:svg:geometry|",
		":svg:svg^:svg:graphics|#currentScale,#zoomAndPan",
		":svg:script^:svg:|type",
		":svg:set^:svg:animation|",
		":svg:stop^:svg:|",
		":svg:style^:svg:|!disabled,media,title,type",
		":svg:switch^:svg:graphics|",
		":svg:symbol^:svg:|",
		":svg:tspan^:svg:textPositioning|",
		":svg:text^:svg:textPositioning|",
		":svg:textPath^:svg:textContent|",
		":svg:title^:svg:|",
		":svg:use^:svg:graphics|",
		":svg:view^:svg:|#zoomAndPan",
		"data^[HTMLElement]|value",
		"keygen^[HTMLElement]|!autofocus,challenge,!disabled,form,keytype,name",
		"menuitem^[HTMLElement]|type,label,icon,!disabled,!checked,radiogroup,!default",
		"summary^[HTMLElement]|",
		"time^[HTMLElement]|dateTime",
		":svg:cursor^:svg:|",
		":math:^[HTMLElement]|!autofocus,nonce,*abort,*animationend,*animationiteration,*animationstart,*auxclick,*beforeinput,*beforematch,*beforetoggle,*beforexrselect,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contentvisibilityautostatechange,*contextlost,*contextmenu,*contextrestored,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*formdata,*gotpointercapture,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*lostpointercapture,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*paste,*pause,*play,*playing,*pointercancel,*pointerdown,*pointerenter,*pointerleave,*pointermove,*pointerout,*pointerover,*pointerrawupdate,*pointerup,*progress,*ratechange,*reset,*resize,*scroll,*scrollend,*securitypolicyviolation,*seeked,*seeking,*select,*selectionchange,*selectstart,*slotchange,*stalled,*submit,*suspend,*timeupdate,*toggle,*transitioncancel,*transitionend,*transitionrun,*transitionstart,*volumechange,*waiting,*webkitanimationend,*webkitanimationiteration,*webkitanimationstart,*webkittransitionend,*wheel,%style,#tabIndex",
		":math:math^:math:|",
		":math:maction^:math:|",
		":math:menclose^:math:|",
		":math:merror^:math:|",
		":math:mfenced^:math:|",
		":math:mfrac^:math:|",
		":math:mi^:math:|",
		":math:mmultiscripts^:math:|",
		":math:mn^:math:|",
		":math:mo^:math:|",
		":math:mover^:math:|",
		":math:mpadded^:math:|",
		":math:mphantom^:math:|",
		":math:mroot^:math:|",
		":math:mrow^:math:|",
		":math:ms^:math:|",
		":math:mspace^:math:|",
		":math:msqrt^:math:|",
		":math:mstyle^:math:|",
		":math:msub^:math:|",
		":math:msubsup^:math:|",
		":math:msup^:math:|",
		":math:mtable^:math:|",
		":math:mtd^:math:|",
		":math:mtext^:math:|",
		":math:mtr^:math:|",
		":math:munder^:math:|",
		":math:munderover^:math:|",
		":math:semantics^:math:|"
	], hi = new Map(Object.entries({
		class: "className",
		for: "htmlFor",
		formaction: "formAction",
		innerHtml: "innerHTML",
		readonly: "readOnly",
		tabindex: "tabIndex",
		"aria-activedescendant": "ariaActiveDescendantElement",
		"aria-atomic": "ariaAtomic",
		"aria-autocomplete": "ariaAutoComplete",
		"aria-busy": "ariaBusy",
		"aria-checked": "ariaChecked",
		"aria-colcount": "ariaColCount",
		"aria-colindex": "ariaColIndex",
		"aria-colindextext": "ariaColIndexText",
		"aria-colspan": "ariaColSpan",
		"aria-controls": "ariaControlsElements",
		"aria-current": "ariaCurrent",
		"aria-describedby": "ariaDescribedByElements",
		"aria-description": "ariaDescription",
		"aria-details": "ariaDetailsElements",
		"aria-disabled": "ariaDisabled",
		"aria-errormessage": "ariaErrorMessageElements",
		"aria-expanded": "ariaExpanded",
		"aria-flowto": "ariaFlowToElements",
		"aria-haspopup": "ariaHasPopup",
		"aria-hidden": "ariaHidden",
		"aria-invalid": "ariaInvalid",
		"aria-keyshortcuts": "ariaKeyShortcuts",
		"aria-label": "ariaLabel",
		"aria-labelledby": "ariaLabelledByElements",
		"aria-level": "ariaLevel",
		"aria-live": "ariaLive",
		"aria-modal": "ariaModal",
		"aria-multiline": "ariaMultiLine",
		"aria-multiselectable": "ariaMultiSelectable",
		"aria-orientation": "ariaOrientation",
		"aria-owns": "ariaOwnsElements",
		"aria-placeholder": "ariaPlaceholder",
		"aria-posinset": "ariaPosInSet",
		"aria-pressed": "ariaPressed",
		"aria-readonly": "ariaReadOnly",
		"aria-required": "ariaRequired",
		"aria-roledescription": "ariaRoleDescription",
		"aria-rowcount": "ariaRowCount",
		"aria-rowindex": "ariaRowIndex",
		"aria-rowindextext": "ariaRowIndexText",
		"aria-rowspan": "ariaRowSpan",
		"aria-selected": "ariaSelected",
		"aria-setsize": "ariaSetSize",
		"aria-sort": "ariaSort",
		"aria-valuemax": "ariaValueMax",
		"aria-valuemin": "ariaValueMin",
		"aria-valuenow": "ariaValueNow",
		"aria-valuetext": "ariaValueText"
	})), Ma = Array.from(hi).reduce((e, [t, r]) => (e.set(t, r), e), /* @__PURE__ */ new Map()), mi = class extends pi {
		_schema = /* @__PURE__ */ new Map();
		_eventSchema = /* @__PURE__ */ new Map();
		constructor() {
			super(), Ra.forEach((e) => {
				let t = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Set(), [n, i] = e.split("|"), s = i.split(","), [a, o] = n.split("^");
				a.split(",").forEach((u) => {
					this._schema.set(u.toLowerCase(), t), this._eventSchema.set(u.toLowerCase(), r);
				});
				let c = o && this._schema.get(o.toLowerCase());
				if (c) {
					for (let [u, p] of c) t.set(u, p);
					for (let u of this._eventSchema.get(o.toLowerCase())) r.add(u);
				}
				s.forEach((u) => {
					if (u.length > 0) switch (u[0]) {
						case "*":
							r.add(u.substring(1));
							break;
						case "!":
							t.set(u.substring(1), Pa);
							break;
						case "#":
							t.set(u.substring(1), Oa);
							break;
						case "%":
							t.set(u.substring(1), Ia);
							break;
						default: t.set(u, Da);
					}
				});
			});
		}
		hasProperty(e, t, r) {
			if (r.some((n) => n.name === ur.name)) return !0;
			if (e.indexOf("-") > -1) {
				if (or(e) || lr(e)) return !1;
				if (r.some((n) => n.name === cr.name)) return !0;
			}
			return (this._schema.get(e.toLowerCase()) || this._schema.get("unknown")).has(t);
		}
		hasElement(e, t) {
			return t.some((r) => r.name === ur.name) || e.indexOf("-") > -1 && (or(e) || lr(e) || t.some((r) => r.name === cr.name)) ? !0 : this._schema.has(e.toLowerCase());
		}
		securityContext(e, t, r) {
			r && (t = this.getMappedPropName(t)), e = e.toLowerCase(), t = t.toLowerCase();
			let n = pr()[e + "|" + t];
			return n || (n = pr()["*|" + t], n || Z.NONE);
		}
		getMappedPropName(e) {
			return hi.get(e) ?? e;
		}
		getDefaultComponentElementName() {
			return "ng-component";
		}
		validateProperty(e) {
			return e.toLowerCase().startsWith("on") ? {
				error: !0,
				msg: `Binding to event property '${e}' is disallowed for security reasons, please use (${e.slice(2)})=...
If '${e}' is a directive input, make sure the directive is imported by the current module.`
			} : { error: !1 };
		}
		validateAttribute(e) {
			return e.toLowerCase().startsWith("on") ? {
				error: !0,
				msg: `Binding to event attribute '${e}' is disallowed for security reasons, please use (${e.slice(2)})=...`
			} : { error: !1 };
		}
		allKnownElementNames() {
			return Array.from(this._schema.keys());
		}
		allKnownAttributesOfElement(e) {
			let t = this._schema.get(e.toLowerCase()) || this._schema.get("unknown");
			return Array.from(t.keys()).map((r) => Ma.get(r) ?? r);
		}
		allKnownEventsOfElement(e) {
			return Array.from(this._eventSchema.get(e.toLowerCase()) ?? []);
		}
		normalizeAnimationStyleProperty(e) {
			return ui(e);
		}
		normalizeAnimationStyleValue(e, t, r) {
			let n = "", i = r.toString().trim(), s = null;
			if (Ba(e) && r !== 0 && r !== "0") if (typeof r == "number") n = "px";
			else {
				let a = r.match(/^[+-]?[\d\.]+([a-z]*)$/);
				a && a[1].length == 0 && (s = `Please provide a CSS unit value for ${t}:${r}`);
			}
			return {
				error: s,
				value: i + n
			};
		}
	};
	f = class {
		closedByChildren = {};
		contentType;
		closedByParent = !1;
		implicitNamespacePrefix;
		isVoid;
		ignoreFirstLf;
		canSelfClose;
		preventNamespaceInheritance;
		constructor({ closedByChildren: e, implicitNamespacePrefix: t, contentType: r = R.PARSABLE_DATA, closedByParent: n = !1, isVoid: i = !1, ignoreFirstLf: s = !1, preventNamespaceInheritance: a = !1, canSelfClose: o = !1 } = {}) {
			e && e.length > 0 && e.forEach((c) => this.closedByChildren[c] = !0), this.isVoid = i, this.closedByParent = n || i, this.implicitNamespacePrefix = t || null, this.contentType = r, this.ignoreFirstLf = s, this.preventNamespaceInheritance = a, this.canSelfClose = o ?? i;
		}
		isClosedByChild(e) {
			return this.isVoid || e.toLowerCase() in this.closedByChildren;
		}
		getContentType(e) {
			return typeof this.contentType == "object" ? (e === void 0 ? void 0 : this.contentType[e]) ?? this.contentType.default : this.contentType;
		}
	};
	De = class gi {
		constructor(t, r, n, i) {
			this.file = t, this.offset = r, this.line = n, this.col = i;
		}
		toString() {
			return this.offset != null ? `${this.file.url}@${this.line}:${this.col}` : this.file.url;
		}
		moveBy(t) {
			let r = this.file.content, n = r.length, i = this.offset, s = this.line, a = this.col;
			for (; i > 0 && t < 0;) if (i--, t++, r.charCodeAt(i) == 10) {
				s--;
				let o = r.substring(0, i - 1).lastIndexOf(`
`);
				a = o > 0 ? i - o : i;
			} else a--;
			for (; i < n && t > 0;) {
				let o = r.charCodeAt(i);
				i++, t--, o == 10 ? (s++, a = 0) : a++;
			}
			return new gi(this.file, i, s, a);
		}
		getContext(t, r) {
			let n = this.file.content, i = this.offset;
			if (i != null) {
				i > n.length - 1 && (i = n.length - 1);
				let s = i, a = 0, o = 0;
				for (; a < t && i > 0 && (i--, a++, !(n[i] == `
` && ++o == r)););
				for (a = 0, o = 0; a < t && s < n.length - 1 && (s++, a++, !(n[s] == `
` && ++o == r)););
				return {
					before: n.substring(i, this.offset),
					after: n.substring(this.offset, s + 1)
				};
			}
			return null;
		}
	}, nt = class {
		constructor(e, t) {
			this.content = e, this.url = t;
		}
	}, h = class {
		constructor(e, t, r = e, n = null) {
			this.start = e, this.end = t, this.fullStart = r, this.details = n;
		}
		toString() {
			return this.start.file.content.substring(this.start.offset, this.end.offset);
		}
	}, di = (function(e) {
		return e[e.WARNING = 0] = "WARNING", e[e.ERROR = 1] = "ERROR", e;
	})({}), ee = class extends Error {
		constructor(e, t, r = di.ERROR, n) {
			super(t), this.span = e, this.msg = t, this.level = r, this.relatedError = n, Object.setPrototypeOf(this, new.target.prototype);
		}
		contextualMessage() {
			let e = this.span.start.getContext(100, 3);
			return e ? `${this.msg} ("${e.before}[${di[this.level]} ->]${e.after}")` : this.msg;
		}
		toString() {
			let e = this.span.details ? `, ${this.span.details}` : "";
			return `${this.contextualMessage()}: ${this.span.start}${e}`;
		}
	};
	de = class {
		constructor(e, t) {
			this.sourceSpan = e, this.i18n = t;
		}
	}, _i = class extends de {
		constructor(e, t, r, n) {
			super(t, n), this.value = e, this.tokens = r;
		}
		visit(e, t) {
			return e.visitText(this, t);
		}
		kind = "text";
	}, Si = class extends de {
		constructor(e, t, r, n) {
			super(t, n), this.value = e, this.tokens = r;
		}
		visit(e, t) {
			return e.visitCdata(this, t);
		}
		kind = "cdata";
	}, Ei = class extends de {
		constructor(e, t, r, n, i, s) {
			super(n, s), this.switchValue = e, this.type = t, this.cases = r, this.switchValueSourceSpan = i;
		}
		visit(e, t) {
			return e.visitExpansion(this, t);
		}
		kind = "expansion";
	}, Ci = class {
		constructor(e, t, r, n, i) {
			this.value = e, this.expression = t, this.sourceSpan = r, this.valueSourceSpan = n, this.expSourceSpan = i;
		}
		visit(e, t) {
			return e.visitExpansionCase(this, t);
		}
		kind = "expansionCase";
	}, vi = class extends de {
		constructor(e, t, r, n, i, s, a) {
			super(r, a), this.name = e, this.value = t, this.keySpan = n, this.valueSpan = i, this.valueTokens = s;
		}
		visit(e, t) {
			return e.visitAttribute(this, t);
		}
		kind = "attribute";
		get nameSpan() {
			return this.keySpan;
		}
	}, te = class extends de {
		constructor(e, t, r, n, i, s, a, o = null, c = null, u, p) {
			super(s, p), this.name = e, this.attrs = t, this.directives = r, this.children = n, this.isSelfClosing = i, this.startSourceSpan = a, this.endSourceSpan = o, this.nameSpan = c, this.isVoid = u;
		}
		visit(e, t) {
			return e.visitElement(this, t);
		}
		kind = "element";
	}, Ti = class {
		constructor(e, t) {
			this.value = e, this.sourceSpan = t;
		}
		visit(e, t) {
			return e.visitComment(this, t);
		}
		kind = "comment";
	}, bi = class {
		constructor(e, t) {
			this.value = e, this.sourceSpan = t;
		}
		visit(e, t) {
			return e.visitDocType(this, t);
		}
		kind = "docType";
	}, ge = class extends de {
		constructor(e, t, r, n, i, s, a = null, o) {
			super(n, o), this.name = e, this.parameters = t, this.children = r, this.nameSpan = i, this.startSourceSpan = s, this.endSourceSpan = a;
		}
		visit(e, t) {
			return e.visitBlock(this, t);
		}
		kind = "block";
	}, G = class extends de {
		constructor(e, t, r, n, i, s, a, o, c, u = null, p) {
			super(o, p), this.componentName = e, this.tagName = t, this.fullName = r, this.attrs = n, this.directives = i, this.children = s, this.isSelfClosing = a, this.startSourceSpan = c, this.endSourceSpan = u;
		}
		visit(e, t) {
			return e.visitComponent(this, t);
		}
		kind = "component";
	}, wi = class {
		constructor(e, t, r, n, i = null) {
			this.name = e, this.attrs = t, this.sourceSpan = r, this.startSourceSpan = n, this.endSourceSpan = i;
		}
		visit(e, t) {
			return e.visitDirective(this, t);
		}
		kind = "directive";
	}, hr = class {
		constructor(e, t) {
			this.expression = e, this.sourceSpan = t;
		}
		visit(e, t) {
			return e.visitBlockParameter(this, t);
		}
		kind = "blockParameter";
		startSourceSpan = null;
		endSourceSpan = null;
	}, mr = class {
		constructor(e, t, r, n, i) {
			this.name = e, this.value = t, this.sourceSpan = r, this.nameSpan = n, this.valueSpan = i;
		}
		visit(e, t) {
			return e.visitLetDeclaration(this, t);
		}
		kind = "letDeclaration";
		startSourceSpan = null;
		endSourceSpan = null;
	};
	fr = class {
		constructor() {}
		visitElement(e, t) {
			this.visitChildren(t, (r) => {
				r(e.attrs), r(e.directives), r(e.children);
			});
		}
		visitAttribute(e, t) {}
		visitText(e, t) {}
		visitCdata(e, t) {}
		visitComment(e, t) {}
		visitDocType(e, t) {}
		visitExpansion(e, t) {
			return this.visitChildren(t, (r) => {
				r(e.cases);
			});
		}
		visitExpansionCase(e, t) {}
		visitBlock(e, t) {
			this.visitChildren(t, (r) => {
				r(e.parameters), r(e.children);
			});
		}
		visitBlockParameter(e, t) {}
		visitLetDeclaration(e, t) {}
		visitComponent(e, t) {
			this.visitChildren(t, (r) => {
				r(e.attrs), r(e.children);
			});
		}
		visitDirective(e, t) {
			this.visitChildren(t, (r) => {
				r(e.attrs);
			});
		}
		visitChildren(e, t) {
			let r = [], n = this;
			function i(s) {
				s && r.push(Ot(n, s, e));
			}
			return t(i), Array.prototype.concat.apply([], r);
		}
	};
	_e = {
		AElig: "Æ",
		AMP: "&",
		amp: "&",
		Aacute: "Á",
		Abreve: "Ă",
		Acirc: "Â",
		Acy: "А",
		Afr: "𝔄",
		Agrave: "À",
		Alpha: "Α",
		Amacr: "Ā",
		And: "⩓",
		Aogon: "Ą",
		Aopf: "𝔸",
		ApplyFunction: "⁡",
		af: "⁡",
		Aring: "Å",
		angst: "Å",
		Ascr: "𝒜",
		Assign: "≔",
		colone: "≔",
		coloneq: "≔",
		Atilde: "Ã",
		Auml: "Ä",
		Backslash: "∖",
		setminus: "∖",
		setmn: "∖",
		smallsetminus: "∖",
		ssetmn: "∖",
		Barv: "⫧",
		Barwed: "⌆",
		doublebarwedge: "⌆",
		Bcy: "Б",
		Because: "∵",
		becaus: "∵",
		because: "∵",
		Bernoullis: "ℬ",
		Bscr: "ℬ",
		bernou: "ℬ",
		Beta: "Β",
		Bfr: "𝔅",
		Bopf: "𝔹",
		Breve: "˘",
		breve: "˘",
		Bumpeq: "≎",
		HumpDownHump: "≎",
		bump: "≎",
		CHcy: "Ч",
		COPY: "©",
		copy: "©",
		Cacute: "Ć",
		Cap: "⋒",
		CapitalDifferentialD: "ⅅ",
		DD: "ⅅ",
		Cayleys: "ℭ",
		Cfr: "ℭ",
		Ccaron: "Č",
		Ccedil: "Ç",
		Ccirc: "Ĉ",
		Cconint: "∰",
		Cdot: "Ċ",
		Cedilla: "¸",
		cedil: "¸",
		CenterDot: "·",
		centerdot: "·",
		middot: "·",
		Chi: "Χ",
		CircleDot: "⊙",
		odot: "⊙",
		CircleMinus: "⊖",
		ominus: "⊖",
		CirclePlus: "⊕",
		oplus: "⊕",
		CircleTimes: "⊗",
		otimes: "⊗",
		ClockwiseContourIntegral: "∲",
		cwconint: "∲",
		CloseCurlyDoubleQuote: "”",
		rdquo: "”",
		rdquor: "”",
		CloseCurlyQuote: "’",
		rsquo: "’",
		rsquor: "’",
		Colon: "∷",
		Proportion: "∷",
		Colone: "⩴",
		Congruent: "≡",
		equiv: "≡",
		Conint: "∯",
		DoubleContourIntegral: "∯",
		ContourIntegral: "∮",
		conint: "∮",
		oint: "∮",
		Copf: "ℂ",
		complexes: "ℂ",
		Coproduct: "∐",
		coprod: "∐",
		CounterClockwiseContourIntegral: "∳",
		awconint: "∳",
		Cross: "⨯",
		Cscr: "𝒞",
		Cup: "⋓",
		CupCap: "≍",
		asympeq: "≍",
		DDotrahd: "⤑",
		DJcy: "Ђ",
		DScy: "Ѕ",
		DZcy: "Џ",
		Dagger: "‡",
		ddagger: "‡",
		Darr: "↡",
		Dashv: "⫤",
		DoubleLeftTee: "⫤",
		Dcaron: "Ď",
		Dcy: "Д",
		Del: "∇",
		nabla: "∇",
		Delta: "Δ",
		Dfr: "𝔇",
		DiacriticalAcute: "´",
		acute: "´",
		DiacriticalDot: "˙",
		dot: "˙",
		DiacriticalDoubleAcute: "˝",
		dblac: "˝",
		DiacriticalGrave: "`",
		grave: "`",
		DiacriticalTilde: "˜",
		tilde: "˜",
		Diamond: "⋄",
		diam: "⋄",
		diamond: "⋄",
		DifferentialD: "ⅆ",
		dd: "ⅆ",
		Dopf: "𝔻",
		Dot: "¨",
		DoubleDot: "¨",
		die: "¨",
		uml: "¨",
		DotDot: "⃜",
		DotEqual: "≐",
		doteq: "≐",
		esdot: "≐",
		DoubleDownArrow: "⇓",
		Downarrow: "⇓",
		dArr: "⇓",
		DoubleLeftArrow: "⇐",
		Leftarrow: "⇐",
		lArr: "⇐",
		DoubleLeftRightArrow: "⇔",
		Leftrightarrow: "⇔",
		hArr: "⇔",
		iff: "⇔",
		DoubleLongLeftArrow: "⟸",
		Longleftarrow: "⟸",
		xlArr: "⟸",
		DoubleLongLeftRightArrow: "⟺",
		Longleftrightarrow: "⟺",
		xhArr: "⟺",
		DoubleLongRightArrow: "⟹",
		Longrightarrow: "⟹",
		xrArr: "⟹",
		DoubleRightArrow: "⇒",
		Implies: "⇒",
		Rightarrow: "⇒",
		rArr: "⇒",
		DoubleRightTee: "⊨",
		vDash: "⊨",
		DoubleUpArrow: "⇑",
		Uparrow: "⇑",
		uArr: "⇑",
		DoubleUpDownArrow: "⇕",
		Updownarrow: "⇕",
		vArr: "⇕",
		DoubleVerticalBar: "∥",
		par: "∥",
		parallel: "∥",
		shortparallel: "∥",
		spar: "∥",
		DownArrow: "↓",
		ShortDownArrow: "↓",
		darr: "↓",
		downarrow: "↓",
		DownArrowBar: "⤓",
		DownArrowUpArrow: "⇵",
		duarr: "⇵",
		DownBreve: "̑",
		DownLeftRightVector: "⥐",
		DownLeftTeeVector: "⥞",
		DownLeftVector: "↽",
		leftharpoondown: "↽",
		lhard: "↽",
		DownLeftVectorBar: "⥖",
		DownRightTeeVector: "⥟",
		DownRightVector: "⇁",
		rhard: "⇁",
		rightharpoondown: "⇁",
		DownRightVectorBar: "⥗",
		DownTee: "⊤",
		top: "⊤",
		DownTeeArrow: "↧",
		mapstodown: "↧",
		Dscr: "𝒟",
		Dstrok: "Đ",
		ENG: "Ŋ",
		ETH: "Ð",
		Eacute: "É",
		Ecaron: "Ě",
		Ecirc: "Ê",
		Ecy: "Э",
		Edot: "Ė",
		Efr: "𝔈",
		Egrave: "È",
		Element: "∈",
		in: "∈",
		isin: "∈",
		isinv: "∈",
		Emacr: "Ē",
		EmptySmallSquare: "◻",
		EmptyVerySmallSquare: "▫",
		Eogon: "Ę",
		Eopf: "𝔼",
		Epsilon: "Ε",
		Equal: "⩵",
		EqualTilde: "≂",
		eqsim: "≂",
		esim: "≂",
		Equilibrium: "⇌",
		rightleftharpoons: "⇌",
		rlhar: "⇌",
		Escr: "ℰ",
		expectation: "ℰ",
		Esim: "⩳",
		Eta: "Η",
		Euml: "Ë",
		Exists: "∃",
		exist: "∃",
		ExponentialE: "ⅇ",
		ee: "ⅇ",
		exponentiale: "ⅇ",
		Fcy: "Ф",
		Ffr: "𝔉",
		FilledSmallSquare: "◼",
		FilledVerySmallSquare: "▪",
		blacksquare: "▪",
		squarf: "▪",
		squf: "▪",
		Fopf: "𝔽",
		ForAll: "∀",
		forall: "∀",
		Fouriertrf: "ℱ",
		Fscr: "ℱ",
		GJcy: "Ѓ",
		GT: ">",
		gt: ">",
		Gamma: "Γ",
		Gammad: "Ϝ",
		Gbreve: "Ğ",
		Gcedil: "Ģ",
		Gcirc: "Ĝ",
		Gcy: "Г",
		Gdot: "Ġ",
		Gfr: "𝔊",
		Gg: "⋙",
		ggg: "⋙",
		Gopf: "𝔾",
		GreaterEqual: "≥",
		ge: "≥",
		geq: "≥",
		GreaterEqualLess: "⋛",
		gel: "⋛",
		gtreqless: "⋛",
		GreaterFullEqual: "≧",
		gE: "≧",
		geqq: "≧",
		GreaterGreater: "⪢",
		GreaterLess: "≷",
		gl: "≷",
		gtrless: "≷",
		GreaterSlantEqual: "⩾",
		geqslant: "⩾",
		ges: "⩾",
		GreaterTilde: "≳",
		gsim: "≳",
		gtrsim: "≳",
		Gscr: "𝒢",
		Gt: "≫",
		NestedGreaterGreater: "≫",
		gg: "≫",
		HARDcy: "Ъ",
		Hacek: "ˇ",
		caron: "ˇ",
		Hat: "^",
		Hcirc: "Ĥ",
		Hfr: "ℌ",
		Poincareplane: "ℌ",
		HilbertSpace: "ℋ",
		Hscr: "ℋ",
		hamilt: "ℋ",
		Hopf: "ℍ",
		quaternions: "ℍ",
		HorizontalLine: "─",
		boxh: "─",
		Hstrok: "Ħ",
		HumpEqual: "≏",
		bumpe: "≏",
		bumpeq: "≏",
		IEcy: "Е",
		IJlig: "Ĳ",
		IOcy: "Ё",
		Iacute: "Í",
		Icirc: "Î",
		Icy: "И",
		Idot: "İ",
		Ifr: "ℑ",
		Im: "ℑ",
		image: "ℑ",
		imagpart: "ℑ",
		Igrave: "Ì",
		Imacr: "Ī",
		ImaginaryI: "ⅈ",
		ii: "ⅈ",
		Int: "∬",
		Integral: "∫",
		int: "∫",
		Intersection: "⋂",
		bigcap: "⋂",
		xcap: "⋂",
		InvisibleComma: "⁣",
		ic: "⁣",
		InvisibleTimes: "⁢",
		it: "⁢",
		Iogon: "Į",
		Iopf: "𝕀",
		Iota: "Ι",
		Iscr: "ℐ",
		imagline: "ℐ",
		Itilde: "Ĩ",
		Iukcy: "І",
		Iuml: "Ï",
		Jcirc: "Ĵ",
		Jcy: "Й",
		Jfr: "𝔍",
		Jopf: "𝕁",
		Jscr: "𝒥",
		Jsercy: "Ј",
		Jukcy: "Є",
		KHcy: "Х",
		KJcy: "Ќ",
		Kappa: "Κ",
		Kcedil: "Ķ",
		Kcy: "К",
		Kfr: "𝔎",
		Kopf: "𝕂",
		Kscr: "𝒦",
		LJcy: "Љ",
		LT: "<",
		lt: "<",
		Lacute: "Ĺ",
		Lambda: "Λ",
		Lang: "⟪",
		Laplacetrf: "ℒ",
		Lscr: "ℒ",
		lagran: "ℒ",
		Larr: "↞",
		twoheadleftarrow: "↞",
		Lcaron: "Ľ",
		Lcedil: "Ļ",
		Lcy: "Л",
		LeftAngleBracket: "⟨",
		lang: "⟨",
		langle: "⟨",
		LeftArrow: "←",
		ShortLeftArrow: "←",
		larr: "←",
		leftarrow: "←",
		slarr: "←",
		LeftArrowBar: "⇤",
		larrb: "⇤",
		LeftArrowRightArrow: "⇆",
		leftrightarrows: "⇆",
		lrarr: "⇆",
		LeftCeiling: "⌈",
		lceil: "⌈",
		LeftDoubleBracket: "⟦",
		lobrk: "⟦",
		LeftDownTeeVector: "⥡",
		LeftDownVector: "⇃",
		dharl: "⇃",
		downharpoonleft: "⇃",
		LeftDownVectorBar: "⥙",
		LeftFloor: "⌊",
		lfloor: "⌊",
		LeftRightArrow: "↔",
		harr: "↔",
		leftrightarrow: "↔",
		LeftRightVector: "⥎",
		LeftTee: "⊣",
		dashv: "⊣",
		LeftTeeArrow: "↤",
		mapstoleft: "↤",
		LeftTeeVector: "⥚",
		LeftTriangle: "⊲",
		vartriangleleft: "⊲",
		vltri: "⊲",
		LeftTriangleBar: "⧏",
		LeftTriangleEqual: "⊴",
		ltrie: "⊴",
		trianglelefteq: "⊴",
		LeftUpDownVector: "⥑",
		LeftUpTeeVector: "⥠",
		LeftUpVector: "↿",
		uharl: "↿",
		upharpoonleft: "↿",
		LeftUpVectorBar: "⥘",
		LeftVector: "↼",
		leftharpoonup: "↼",
		lharu: "↼",
		LeftVectorBar: "⥒",
		LessEqualGreater: "⋚",
		leg: "⋚",
		lesseqgtr: "⋚",
		LessFullEqual: "≦",
		lE: "≦",
		leqq: "≦",
		LessGreater: "≶",
		lessgtr: "≶",
		lg: "≶",
		LessLess: "⪡",
		LessSlantEqual: "⩽",
		leqslant: "⩽",
		les: "⩽",
		LessTilde: "≲",
		lesssim: "≲",
		lsim: "≲",
		Lfr: "𝔏",
		Ll: "⋘",
		Lleftarrow: "⇚",
		lAarr: "⇚",
		Lmidot: "Ŀ",
		LongLeftArrow: "⟵",
		longleftarrow: "⟵",
		xlarr: "⟵",
		LongLeftRightArrow: "⟷",
		longleftrightarrow: "⟷",
		xharr: "⟷",
		LongRightArrow: "⟶",
		longrightarrow: "⟶",
		xrarr: "⟶",
		Lopf: "𝕃",
		LowerLeftArrow: "↙",
		swarr: "↙",
		swarrow: "↙",
		LowerRightArrow: "↘",
		searr: "↘",
		searrow: "↘",
		Lsh: "↰",
		lsh: "↰",
		Lstrok: "Ł",
		Lt: "≪",
		NestedLessLess: "≪",
		ll: "≪",
		Map: "⤅",
		Mcy: "М",
		MediumSpace: " ",
		Mellintrf: "ℳ",
		Mscr: "ℳ",
		phmmat: "ℳ",
		Mfr: "𝔐",
		MinusPlus: "∓",
		mnplus: "∓",
		mp: "∓",
		Mopf: "𝕄",
		Mu: "Μ",
		NJcy: "Њ",
		Nacute: "Ń",
		Ncaron: "Ň",
		Ncedil: "Ņ",
		Ncy: "Н",
		NegativeMediumSpace: "​",
		NegativeThickSpace: "​",
		NegativeThinSpace: "​",
		NegativeVeryThinSpace: "​",
		ZeroWidthSpace: "​",
		NewLine: `
`,
		Nfr: "𝔑",
		NoBreak: "⁠",
		NonBreakingSpace: "\xA0",
		nbsp: "\xA0",
		Nopf: "ℕ",
		naturals: "ℕ",
		Not: "⫬",
		NotCongruent: "≢",
		nequiv: "≢",
		NotCupCap: "≭",
		NotDoubleVerticalBar: "∦",
		npar: "∦",
		nparallel: "∦",
		nshortparallel: "∦",
		nspar: "∦",
		NotElement: "∉",
		notin: "∉",
		notinva: "∉",
		NotEqual: "≠",
		ne: "≠",
		NotEqualTilde: "≂̸",
		nesim: "≂̸",
		NotExists: "∄",
		nexist: "∄",
		nexists: "∄",
		NotGreater: "≯",
		ngt: "≯",
		ngtr: "≯",
		NotGreaterEqual: "≱",
		nge: "≱",
		ngeq: "≱",
		NotGreaterFullEqual: "≧̸",
		ngE: "≧̸",
		ngeqq: "≧̸",
		NotGreaterGreater: "≫̸",
		nGtv: "≫̸",
		NotGreaterLess: "≹",
		ntgl: "≹",
		NotGreaterSlantEqual: "⩾̸",
		ngeqslant: "⩾̸",
		nges: "⩾̸",
		NotGreaterTilde: "≵",
		ngsim: "≵",
		NotHumpDownHump: "≎̸",
		nbump: "≎̸",
		NotHumpEqual: "≏̸",
		nbumpe: "≏̸",
		NotLeftTriangle: "⋪",
		nltri: "⋪",
		ntriangleleft: "⋪",
		NotLeftTriangleBar: "⧏̸",
		NotLeftTriangleEqual: "⋬",
		nltrie: "⋬",
		ntrianglelefteq: "⋬",
		NotLess: "≮",
		nless: "≮",
		nlt: "≮",
		NotLessEqual: "≰",
		nle: "≰",
		nleq: "≰",
		NotLessGreater: "≸",
		ntlg: "≸",
		NotLessLess: "≪̸",
		nLtv: "≪̸",
		NotLessSlantEqual: "⩽̸",
		nleqslant: "⩽̸",
		nles: "⩽̸",
		NotLessTilde: "≴",
		nlsim: "≴",
		NotNestedGreaterGreater: "⪢̸",
		NotNestedLessLess: "⪡̸",
		NotPrecedes: "⊀",
		npr: "⊀",
		nprec: "⊀",
		NotPrecedesEqual: "⪯̸",
		npre: "⪯̸",
		npreceq: "⪯̸",
		NotPrecedesSlantEqual: "⋠",
		nprcue: "⋠",
		NotReverseElement: "∌",
		notni: "∌",
		notniva: "∌",
		NotRightTriangle: "⋫",
		nrtri: "⋫",
		ntriangleright: "⋫",
		NotRightTriangleBar: "⧐̸",
		NotRightTriangleEqual: "⋭",
		nrtrie: "⋭",
		ntrianglerighteq: "⋭",
		NotSquareSubset: "⊏̸",
		NotSquareSubsetEqual: "⋢",
		nsqsube: "⋢",
		NotSquareSuperset: "⊐̸",
		NotSquareSupersetEqual: "⋣",
		nsqsupe: "⋣",
		NotSubset: "⊂⃒",
		nsubset: "⊂⃒",
		vnsub: "⊂⃒",
		NotSubsetEqual: "⊈",
		nsube: "⊈",
		nsubseteq: "⊈",
		NotSucceeds: "⊁",
		nsc: "⊁",
		nsucc: "⊁",
		NotSucceedsEqual: "⪰̸",
		nsce: "⪰̸",
		nsucceq: "⪰̸",
		NotSucceedsSlantEqual: "⋡",
		nsccue: "⋡",
		NotSucceedsTilde: "≿̸",
		NotSuperset: "⊃⃒",
		nsupset: "⊃⃒",
		vnsup: "⊃⃒",
		NotSupersetEqual: "⊉",
		nsupe: "⊉",
		nsupseteq: "⊉",
		NotTilde: "≁",
		nsim: "≁",
		NotTildeEqual: "≄",
		nsime: "≄",
		nsimeq: "≄",
		NotTildeFullEqual: "≇",
		ncong: "≇",
		NotTildeTilde: "≉",
		nap: "≉",
		napprox: "≉",
		NotVerticalBar: "∤",
		nmid: "∤",
		nshortmid: "∤",
		nsmid: "∤",
		Nscr: "𝒩",
		Ntilde: "Ñ",
		Nu: "Ν",
		OElig: "Œ",
		Oacute: "Ó",
		Ocirc: "Ô",
		Ocy: "О",
		Odblac: "Ő",
		Ofr: "𝔒",
		Ograve: "Ò",
		Omacr: "Ō",
		Omega: "Ω",
		ohm: "Ω",
		Omicron: "Ο",
		Oopf: "𝕆",
		OpenCurlyDoubleQuote: "“",
		ldquo: "“",
		OpenCurlyQuote: "‘",
		lsquo: "‘",
		Or: "⩔",
		Oscr: "𝒪",
		Oslash: "Ø",
		Otilde: "Õ",
		Otimes: "⨷",
		Ouml: "Ö",
		OverBar: "‾",
		oline: "‾",
		OverBrace: "⏞",
		OverBracket: "⎴",
		tbrk: "⎴",
		OverParenthesis: "⏜",
		PartialD: "∂",
		part: "∂",
		Pcy: "П",
		Pfr: "𝔓",
		Phi: "Φ",
		Pi: "Π",
		PlusMinus: "±",
		plusmn: "±",
		pm: "±",
		Popf: "ℙ",
		primes: "ℙ",
		Pr: "⪻",
		Precedes: "≺",
		pr: "≺",
		prec: "≺",
		PrecedesEqual: "⪯",
		pre: "⪯",
		preceq: "⪯",
		PrecedesSlantEqual: "≼",
		prcue: "≼",
		preccurlyeq: "≼",
		PrecedesTilde: "≾",
		precsim: "≾",
		prsim: "≾",
		Prime: "″",
		Product: "∏",
		prod: "∏",
		Proportional: "∝",
		prop: "∝",
		propto: "∝",
		varpropto: "∝",
		vprop: "∝",
		Pscr: "𝒫",
		Psi: "Ψ",
		QUOT: "\"",
		quot: "\"",
		Qfr: "𝔔",
		Qopf: "ℚ",
		rationals: "ℚ",
		Qscr: "𝒬",
		RBarr: "⤐",
		drbkarow: "⤐",
		REG: "®",
		circledR: "®",
		reg: "®",
		Racute: "Ŕ",
		Rang: "⟫",
		Rarr: "↠",
		twoheadrightarrow: "↠",
		Rarrtl: "⤖",
		Rcaron: "Ř",
		Rcedil: "Ŗ",
		Rcy: "Р",
		Re: "ℜ",
		Rfr: "ℜ",
		real: "ℜ",
		realpart: "ℜ",
		ReverseElement: "∋",
		SuchThat: "∋",
		ni: "∋",
		niv: "∋",
		ReverseEquilibrium: "⇋",
		leftrightharpoons: "⇋",
		lrhar: "⇋",
		ReverseUpEquilibrium: "⥯",
		duhar: "⥯",
		Rho: "Ρ",
		RightAngleBracket: "⟩",
		rang: "⟩",
		rangle: "⟩",
		RightArrow: "→",
		ShortRightArrow: "→",
		rarr: "→",
		rightarrow: "→",
		srarr: "→",
		RightArrowBar: "⇥",
		rarrb: "⇥",
		RightArrowLeftArrow: "⇄",
		rightleftarrows: "⇄",
		rlarr: "⇄",
		RightCeiling: "⌉",
		rceil: "⌉",
		RightDoubleBracket: "⟧",
		robrk: "⟧",
		RightDownTeeVector: "⥝",
		RightDownVector: "⇂",
		dharr: "⇂",
		downharpoonright: "⇂",
		RightDownVectorBar: "⥕",
		RightFloor: "⌋",
		rfloor: "⌋",
		RightTee: "⊢",
		vdash: "⊢",
		RightTeeArrow: "↦",
		map: "↦",
		mapsto: "↦",
		RightTeeVector: "⥛",
		RightTriangle: "⊳",
		vartriangleright: "⊳",
		vrtri: "⊳",
		RightTriangleBar: "⧐",
		RightTriangleEqual: "⊵",
		rtrie: "⊵",
		trianglerighteq: "⊵",
		RightUpDownVector: "⥏",
		RightUpTeeVector: "⥜",
		RightUpVector: "↾",
		uharr: "↾",
		upharpoonright: "↾",
		RightUpVectorBar: "⥔",
		RightVector: "⇀",
		rharu: "⇀",
		rightharpoonup: "⇀",
		RightVectorBar: "⥓",
		Ropf: "ℝ",
		reals: "ℝ",
		RoundImplies: "⥰",
		Rrightarrow: "⇛",
		rAarr: "⇛",
		Rscr: "ℛ",
		realine: "ℛ",
		Rsh: "↱",
		rsh: "↱",
		RuleDelayed: "⧴",
		SHCHcy: "Щ",
		SHcy: "Ш",
		SOFTcy: "Ь",
		Sacute: "Ś",
		Sc: "⪼",
		Scaron: "Š",
		Scedil: "Ş",
		Scirc: "Ŝ",
		Scy: "С",
		Sfr: "𝔖",
		ShortUpArrow: "↑",
		UpArrow: "↑",
		uarr: "↑",
		uparrow: "↑",
		Sigma: "Σ",
		SmallCircle: "∘",
		compfn: "∘",
		Sopf: "𝕊",
		Sqrt: "√",
		radic: "√",
		Square: "□",
		squ: "□",
		square: "□",
		SquareIntersection: "⊓",
		sqcap: "⊓",
		SquareSubset: "⊏",
		sqsub: "⊏",
		sqsubset: "⊏",
		SquareSubsetEqual: "⊑",
		sqsube: "⊑",
		sqsubseteq: "⊑",
		SquareSuperset: "⊐",
		sqsup: "⊐",
		sqsupset: "⊐",
		SquareSupersetEqual: "⊒",
		sqsupe: "⊒",
		sqsupseteq: "⊒",
		SquareUnion: "⊔",
		sqcup: "⊔",
		Sscr: "𝒮",
		Star: "⋆",
		sstarf: "⋆",
		Sub: "⋐",
		Subset: "⋐",
		SubsetEqual: "⊆",
		sube: "⊆",
		subseteq: "⊆",
		Succeeds: "≻",
		sc: "≻",
		succ: "≻",
		SucceedsEqual: "⪰",
		sce: "⪰",
		succeq: "⪰",
		SucceedsSlantEqual: "≽",
		sccue: "≽",
		succcurlyeq: "≽",
		SucceedsTilde: "≿",
		scsim: "≿",
		succsim: "≿",
		Sum: "∑",
		sum: "∑",
		Sup: "⋑",
		Supset: "⋑",
		Superset: "⊃",
		sup: "⊃",
		supset: "⊃",
		SupersetEqual: "⊇",
		supe: "⊇",
		supseteq: "⊇",
		THORN: "Þ",
		TRADE: "™",
		trade: "™",
		TSHcy: "Ћ",
		TScy: "Ц",
		Tab: "	",
		Tau: "Τ",
		Tcaron: "Ť",
		Tcedil: "Ţ",
		Tcy: "Т",
		Tfr: "𝔗",
		Therefore: "∴",
		there4: "∴",
		therefore: "∴",
		Theta: "Θ",
		ThickSpace: "  ",
		ThinSpace: " ",
		thinsp: " ",
		Tilde: "∼",
		sim: "∼",
		thicksim: "∼",
		thksim: "∼",
		TildeEqual: "≃",
		sime: "≃",
		simeq: "≃",
		TildeFullEqual: "≅",
		cong: "≅",
		TildeTilde: "≈",
		ap: "≈",
		approx: "≈",
		asymp: "≈",
		thickapprox: "≈",
		thkap: "≈",
		Topf: "𝕋",
		TripleDot: "⃛",
		tdot: "⃛",
		Tscr: "𝒯",
		Tstrok: "Ŧ",
		Uacute: "Ú",
		Uarr: "↟",
		Uarrocir: "⥉",
		Ubrcy: "Ў",
		Ubreve: "Ŭ",
		Ucirc: "Û",
		Ucy: "У",
		Udblac: "Ű",
		Ufr: "𝔘",
		Ugrave: "Ù",
		Umacr: "Ū",
		UnderBar: "_",
		lowbar: "_",
		UnderBrace: "⏟",
		UnderBracket: "⎵",
		bbrk: "⎵",
		UnderParenthesis: "⏝",
		Union: "⋃",
		bigcup: "⋃",
		xcup: "⋃",
		UnionPlus: "⊎",
		uplus: "⊎",
		Uogon: "Ų",
		Uopf: "𝕌",
		UpArrowBar: "⤒",
		UpArrowDownArrow: "⇅",
		udarr: "⇅",
		UpDownArrow: "↕",
		updownarrow: "↕",
		varr: "↕",
		UpEquilibrium: "⥮",
		udhar: "⥮",
		UpTee: "⊥",
		bot: "⊥",
		bottom: "⊥",
		perp: "⊥",
		UpTeeArrow: "↥",
		mapstoup: "↥",
		UpperLeftArrow: "↖",
		nwarr: "↖",
		nwarrow: "↖",
		UpperRightArrow: "↗",
		nearr: "↗",
		nearrow: "↗",
		Upsi: "ϒ",
		upsih: "ϒ",
		Upsilon: "Υ",
		Uring: "Ů",
		Uscr: "𝒰",
		Utilde: "Ũ",
		Uuml: "Ü",
		VDash: "⊫",
		Vbar: "⫫",
		Vcy: "В",
		Vdash: "⊩",
		Vdashl: "⫦",
		Vee: "⋁",
		bigvee: "⋁",
		xvee: "⋁",
		Verbar: "‖",
		Vert: "‖",
		VerticalBar: "∣",
		mid: "∣",
		shortmid: "∣",
		smid: "∣",
		VerticalLine: "|",
		verbar: "|",
		vert: "|",
		VerticalSeparator: "❘",
		VerticalTilde: "≀",
		wr: "≀",
		wreath: "≀",
		VeryThinSpace: " ",
		hairsp: " ",
		Vfr: "𝔙",
		Vopf: "𝕍",
		Vscr: "𝒱",
		Vvdash: "⊪",
		Wcirc: "Ŵ",
		Wedge: "⋀",
		bigwedge: "⋀",
		xwedge: "⋀",
		Wfr: "𝔚",
		Wopf: "𝕎",
		Wscr: "𝒲",
		Xfr: "𝔛",
		Xi: "Ξ",
		Xopf: "𝕏",
		Xscr: "𝒳",
		YAcy: "Я",
		YIcy: "Ї",
		YUcy: "Ю",
		Yacute: "Ý",
		Ycirc: "Ŷ",
		Ycy: "Ы",
		Yfr: "𝔜",
		Yopf: "𝕐",
		Yscr: "𝒴",
		Yuml: "Ÿ",
		ZHcy: "Ж",
		Zacute: "Ź",
		Zcaron: "Ž",
		Zcy: "З",
		Zdot: "Ż",
		Zeta: "Ζ",
		Zfr: "ℨ",
		zeetrf: "ℨ",
		Zopf: "ℤ",
		integers: "ℤ",
		Zscr: "𝒵",
		aacute: "á",
		abreve: "ă",
		ac: "∾",
		mstpos: "∾",
		acE: "∾̳",
		acd: "∿",
		acirc: "â",
		acy: "а",
		aelig: "æ",
		afr: "𝔞",
		agrave: "à",
		alefsym: "ℵ",
		aleph: "ℵ",
		alpha: "α",
		amacr: "ā",
		amalg: "⨿",
		and: "∧",
		wedge: "∧",
		andand: "⩕",
		andd: "⩜",
		andslope: "⩘",
		andv: "⩚",
		ang: "∠",
		angle: "∠",
		ange: "⦤",
		angmsd: "∡",
		measuredangle: "∡",
		angmsdaa: "⦨",
		angmsdab: "⦩",
		angmsdac: "⦪",
		angmsdad: "⦫",
		angmsdae: "⦬",
		angmsdaf: "⦭",
		angmsdag: "⦮",
		angmsdah: "⦯",
		angrt: "∟",
		angrtvb: "⊾",
		angrtvbd: "⦝",
		angsph: "∢",
		angzarr: "⍼",
		aogon: "ą",
		aopf: "𝕒",
		apE: "⩰",
		apacir: "⩯",
		ape: "≊",
		approxeq: "≊",
		apid: "≋",
		apos: "'",
		aring: "å",
		ascr: "𝒶",
		ast: "*",
		midast: "*",
		atilde: "ã",
		auml: "ä",
		awint: "⨑",
		bNot: "⫭",
		backcong: "≌",
		bcong: "≌",
		backepsilon: "϶",
		bepsi: "϶",
		backprime: "‵",
		bprime: "‵",
		backsim: "∽",
		bsim: "∽",
		backsimeq: "⋍",
		bsime: "⋍",
		barvee: "⊽",
		barwed: "⌅",
		barwedge: "⌅",
		bbrktbrk: "⎶",
		bcy: "б",
		bdquo: "„",
		ldquor: "„",
		bemptyv: "⦰",
		beta: "β",
		beth: "ℶ",
		between: "≬",
		twixt: "≬",
		bfr: "𝔟",
		bigcirc: "◯",
		xcirc: "◯",
		bigodot: "⨀",
		xodot: "⨀",
		bigoplus: "⨁",
		xoplus: "⨁",
		bigotimes: "⨂",
		xotime: "⨂",
		bigsqcup: "⨆",
		xsqcup: "⨆",
		bigstar: "★",
		starf: "★",
		bigtriangledown: "▽",
		xdtri: "▽",
		bigtriangleup: "△",
		xutri: "△",
		biguplus: "⨄",
		xuplus: "⨄",
		bkarow: "⤍",
		rbarr: "⤍",
		blacklozenge: "⧫",
		lozf: "⧫",
		blacktriangle: "▴",
		utrif: "▴",
		blacktriangledown: "▾",
		dtrif: "▾",
		blacktriangleleft: "◂",
		ltrif: "◂",
		blacktriangleright: "▸",
		rtrif: "▸",
		blank: "␣",
		blk12: "▒",
		blk14: "░",
		blk34: "▓",
		block: "█",
		bne: "=⃥",
		bnequiv: "≡⃥",
		bnot: "⌐",
		bopf: "𝕓",
		bowtie: "⋈",
		boxDL: "╗",
		boxDR: "╔",
		boxDl: "╖",
		boxDr: "╓",
		boxH: "═",
		boxHD: "╦",
		boxHU: "╩",
		boxHd: "╤",
		boxHu: "╧",
		boxUL: "╝",
		boxUR: "╚",
		boxUl: "╜",
		boxUr: "╙",
		boxV: "║",
		boxVH: "╬",
		boxVL: "╣",
		boxVR: "╠",
		boxVh: "╫",
		boxVl: "╢",
		boxVr: "╟",
		boxbox: "⧉",
		boxdL: "╕",
		boxdR: "╒",
		boxdl: "┐",
		boxdr: "┌",
		boxhD: "╥",
		boxhU: "╨",
		boxhd: "┬",
		boxhu: "┴",
		boxminus: "⊟",
		minusb: "⊟",
		boxplus: "⊞",
		plusb: "⊞",
		boxtimes: "⊠",
		timesb: "⊠",
		boxuL: "╛",
		boxuR: "╘",
		boxul: "┘",
		boxur: "└",
		boxv: "│",
		boxvH: "╪",
		boxvL: "╡",
		boxvR: "╞",
		boxvh: "┼",
		boxvl: "┤",
		boxvr: "├",
		brvbar: "¦",
		bscr: "𝒷",
		bsemi: "⁏",
		bsol: "\\",
		bsolb: "⧅",
		bsolhsub: "⟈",
		bull: "•",
		bullet: "•",
		bumpE: "⪮",
		cacute: "ć",
		cap: "∩",
		capand: "⩄",
		capbrcup: "⩉",
		capcap: "⩋",
		capcup: "⩇",
		capdot: "⩀",
		caps: "∩︀",
		caret: "⁁",
		ccaps: "⩍",
		ccaron: "č",
		ccedil: "ç",
		ccirc: "ĉ",
		ccups: "⩌",
		ccupssm: "⩐",
		cdot: "ċ",
		cemptyv: "⦲",
		cent: "¢",
		cfr: "𝔠",
		chcy: "ч",
		check: "✓",
		checkmark: "✓",
		chi: "χ",
		cir: "○",
		cirE: "⧃",
		circ: "ˆ",
		circeq: "≗",
		cire: "≗",
		circlearrowleft: "↺",
		olarr: "↺",
		circlearrowright: "↻",
		orarr: "↻",
		circledS: "Ⓢ",
		oS: "Ⓢ",
		circledast: "⊛",
		oast: "⊛",
		circledcirc: "⊚",
		ocir: "⊚",
		circleddash: "⊝",
		odash: "⊝",
		cirfnint: "⨐",
		cirmid: "⫯",
		cirscir: "⧂",
		clubs: "♣",
		clubsuit: "♣",
		colon: ":",
		comma: ",",
		commat: "@",
		comp: "∁",
		complement: "∁",
		congdot: "⩭",
		copf: "𝕔",
		copysr: "℗",
		crarr: "↵",
		cross: "✗",
		cscr: "𝒸",
		csub: "⫏",
		csube: "⫑",
		csup: "⫐",
		csupe: "⫒",
		ctdot: "⋯",
		cudarrl: "⤸",
		cudarrr: "⤵",
		cuepr: "⋞",
		curlyeqprec: "⋞",
		cuesc: "⋟",
		curlyeqsucc: "⋟",
		cularr: "↶",
		curvearrowleft: "↶",
		cularrp: "⤽",
		cup: "∪",
		cupbrcap: "⩈",
		cupcap: "⩆",
		cupcup: "⩊",
		cupdot: "⊍",
		cupor: "⩅",
		cups: "∪︀",
		curarr: "↷",
		curvearrowright: "↷",
		curarrm: "⤼",
		curlyvee: "⋎",
		cuvee: "⋎",
		curlywedge: "⋏",
		cuwed: "⋏",
		curren: "¤",
		cwint: "∱",
		cylcty: "⌭",
		dHar: "⥥",
		dagger: "†",
		daleth: "ℸ",
		dash: "‐",
		hyphen: "‐",
		dbkarow: "⤏",
		rBarr: "⤏",
		dcaron: "ď",
		dcy: "д",
		ddarr: "⇊",
		downdownarrows: "⇊",
		ddotseq: "⩷",
		eDDot: "⩷",
		deg: "°",
		delta: "δ",
		demptyv: "⦱",
		dfisht: "⥿",
		dfr: "𝔡",
		diamondsuit: "♦",
		diams: "♦",
		digamma: "ϝ",
		gammad: "ϝ",
		disin: "⋲",
		div: "÷",
		divide: "÷",
		divideontimes: "⋇",
		divonx: "⋇",
		djcy: "ђ",
		dlcorn: "⌞",
		llcorner: "⌞",
		dlcrop: "⌍",
		dollar: "$",
		dopf: "𝕕",
		doteqdot: "≑",
		eDot: "≑",
		dotminus: "∸",
		minusd: "∸",
		dotplus: "∔",
		plusdo: "∔",
		dotsquare: "⊡",
		sdotb: "⊡",
		drcorn: "⌟",
		lrcorner: "⌟",
		drcrop: "⌌",
		dscr: "𝒹",
		dscy: "ѕ",
		dsol: "⧶",
		dstrok: "đ",
		dtdot: "⋱",
		dtri: "▿",
		triangledown: "▿",
		dwangle: "⦦",
		dzcy: "џ",
		dzigrarr: "⟿",
		eacute: "é",
		easter: "⩮",
		ecaron: "ě",
		ecir: "≖",
		eqcirc: "≖",
		ecirc: "ê",
		ecolon: "≕",
		eqcolon: "≕",
		ecy: "э",
		edot: "ė",
		efDot: "≒",
		fallingdotseq: "≒",
		efr: "𝔢",
		eg: "⪚",
		egrave: "è",
		egs: "⪖",
		eqslantgtr: "⪖",
		egsdot: "⪘",
		el: "⪙",
		elinters: "⏧",
		ell: "ℓ",
		els: "⪕",
		eqslantless: "⪕",
		elsdot: "⪗",
		emacr: "ē",
		empty: "∅",
		emptyset: "∅",
		emptyv: "∅",
		varnothing: "∅",
		emsp13: " ",
		emsp14: " ",
		emsp: " ",
		eng: "ŋ",
		ensp: " ",
		eogon: "ę",
		eopf: "𝕖",
		epar: "⋕",
		eparsl: "⧣",
		eplus: "⩱",
		epsi: "ε",
		epsilon: "ε",
		epsiv: "ϵ",
		straightepsilon: "ϵ",
		varepsilon: "ϵ",
		equals: "=",
		equest: "≟",
		questeq: "≟",
		equivDD: "⩸",
		eqvparsl: "⧥",
		erDot: "≓",
		risingdotseq: "≓",
		erarr: "⥱",
		escr: "ℯ",
		eta: "η",
		eth: "ð",
		euml: "ë",
		euro: "€",
		excl: "!",
		fcy: "ф",
		female: "♀",
		ffilig: "ﬃ",
		fflig: "ﬀ",
		ffllig: "ﬄ",
		ffr: "𝔣",
		filig: "ﬁ",
		fjlig: "fj",
		flat: "♭",
		fllig: "ﬂ",
		fltns: "▱",
		fnof: "ƒ",
		fopf: "𝕗",
		fork: "⋔",
		pitchfork: "⋔",
		forkv: "⫙",
		fpartint: "⨍",
		frac12: "½",
		half: "½",
		frac13: "⅓",
		frac14: "¼",
		frac15: "⅕",
		frac16: "⅙",
		frac18: "⅛",
		frac23: "⅔",
		frac25: "⅖",
		frac34: "¾",
		frac35: "⅗",
		frac38: "⅜",
		frac45: "⅘",
		frac56: "⅚",
		frac58: "⅝",
		frac78: "⅞",
		frasl: "⁄",
		frown: "⌢",
		sfrown: "⌢",
		fscr: "𝒻",
		gEl: "⪌",
		gtreqqless: "⪌",
		gacute: "ǵ",
		gamma: "γ",
		gap: "⪆",
		gtrapprox: "⪆",
		gbreve: "ğ",
		gcirc: "ĝ",
		gcy: "г",
		gdot: "ġ",
		gescc: "⪩",
		gesdot: "⪀",
		gesdoto: "⪂",
		gesdotol: "⪄",
		gesl: "⋛︀",
		gesles: "⪔",
		gfr: "𝔤",
		gimel: "ℷ",
		gjcy: "ѓ",
		glE: "⪒",
		gla: "⪥",
		glj: "⪤",
		gnE: "≩",
		gneqq: "≩",
		gnap: "⪊",
		gnapprox: "⪊",
		gne: "⪈",
		gneq: "⪈",
		gnsim: "⋧",
		gopf: "𝕘",
		gscr: "ℊ",
		gsime: "⪎",
		gsiml: "⪐",
		gtcc: "⪧",
		gtcir: "⩺",
		gtdot: "⋗",
		gtrdot: "⋗",
		gtlPar: "⦕",
		gtquest: "⩼",
		gtrarr: "⥸",
		gvertneqq: "≩︀",
		gvnE: "≩︀",
		hardcy: "ъ",
		harrcir: "⥈",
		harrw: "↭",
		leftrightsquigarrow: "↭",
		hbar: "ℏ",
		hslash: "ℏ",
		planck: "ℏ",
		plankv: "ℏ",
		hcirc: "ĥ",
		hearts: "♥",
		heartsuit: "♥",
		hellip: "…",
		mldr: "…",
		hercon: "⊹",
		hfr: "𝔥",
		hksearow: "⤥",
		searhk: "⤥",
		hkswarow: "⤦",
		swarhk: "⤦",
		hoarr: "⇿",
		homtht: "∻",
		hookleftarrow: "↩",
		larrhk: "↩",
		hookrightarrow: "↪",
		rarrhk: "↪",
		hopf: "𝕙",
		horbar: "―",
		hscr: "𝒽",
		hstrok: "ħ",
		hybull: "⁃",
		iacute: "í",
		icirc: "î",
		icy: "и",
		iecy: "е",
		iexcl: "¡",
		ifr: "𝔦",
		igrave: "ì",
		iiiint: "⨌",
		qint: "⨌",
		iiint: "∭",
		tint: "∭",
		iinfin: "⧜",
		iiota: "℩",
		ijlig: "ĳ",
		imacr: "ī",
		imath: "ı",
		inodot: "ı",
		imof: "⊷",
		imped: "Ƶ",
		incare: "℅",
		infin: "∞",
		infintie: "⧝",
		intcal: "⊺",
		intercal: "⊺",
		intlarhk: "⨗",
		intprod: "⨼",
		iprod: "⨼",
		iocy: "ё",
		iogon: "į",
		iopf: "𝕚",
		iota: "ι",
		iquest: "¿",
		iscr: "𝒾",
		isinE: "⋹",
		isindot: "⋵",
		isins: "⋴",
		isinsv: "⋳",
		itilde: "ĩ",
		iukcy: "і",
		iuml: "ï",
		jcirc: "ĵ",
		jcy: "й",
		jfr: "𝔧",
		jmath: "ȷ",
		jopf: "𝕛",
		jscr: "𝒿",
		jsercy: "ј",
		jukcy: "є",
		kappa: "κ",
		kappav: "ϰ",
		varkappa: "ϰ",
		kcedil: "ķ",
		kcy: "к",
		kfr: "𝔨",
		kgreen: "ĸ",
		khcy: "х",
		kjcy: "ќ",
		kopf: "𝕜",
		kscr: "𝓀",
		lAtail: "⤛",
		lBarr: "⤎",
		lEg: "⪋",
		lesseqqgtr: "⪋",
		lHar: "⥢",
		lacute: "ĺ",
		laemptyv: "⦴",
		lambda: "λ",
		langd: "⦑",
		lap: "⪅",
		lessapprox: "⪅",
		laquo: "«",
		larrbfs: "⤟",
		larrfs: "⤝",
		larrlp: "↫",
		looparrowleft: "↫",
		larrpl: "⤹",
		larrsim: "⥳",
		larrtl: "↢",
		leftarrowtail: "↢",
		lat: "⪫",
		latail: "⤙",
		late: "⪭",
		lates: "⪭︀",
		lbarr: "⤌",
		lbbrk: "❲",
		lbrace: "{",
		lcub: "{",
		lbrack: "[",
		lsqb: "[",
		lbrke: "⦋",
		lbrksld: "⦏",
		lbrkslu: "⦍",
		lcaron: "ľ",
		lcedil: "ļ",
		lcy: "л",
		ldca: "⤶",
		ldrdhar: "⥧",
		ldrushar: "⥋",
		ldsh: "↲",
		le: "≤",
		leq: "≤",
		leftleftarrows: "⇇",
		llarr: "⇇",
		leftthreetimes: "⋋",
		lthree: "⋋",
		lescc: "⪨",
		lesdot: "⩿",
		lesdoto: "⪁",
		lesdotor: "⪃",
		lesg: "⋚︀",
		lesges: "⪓",
		lessdot: "⋖",
		ltdot: "⋖",
		lfisht: "⥼",
		lfr: "𝔩",
		lgE: "⪑",
		lharul: "⥪",
		lhblk: "▄",
		ljcy: "љ",
		llhard: "⥫",
		lltri: "◺",
		lmidot: "ŀ",
		lmoust: "⎰",
		lmoustache: "⎰",
		lnE: "≨",
		lneqq: "≨",
		lnap: "⪉",
		lnapprox: "⪉",
		lne: "⪇",
		lneq: "⪇",
		lnsim: "⋦",
		loang: "⟬",
		loarr: "⇽",
		longmapsto: "⟼",
		xmap: "⟼",
		looparrowright: "↬",
		rarrlp: "↬",
		lopar: "⦅",
		lopf: "𝕝",
		loplus: "⨭",
		lotimes: "⨴",
		lowast: "∗",
		loz: "◊",
		lozenge: "◊",
		lpar: "(",
		lparlt: "⦓",
		lrhard: "⥭",
		lrm: "‎",
		lrtri: "⊿",
		lsaquo: "‹",
		lscr: "𝓁",
		lsime: "⪍",
		lsimg: "⪏",
		lsquor: "‚",
		sbquo: "‚",
		lstrok: "ł",
		ltcc: "⪦",
		ltcir: "⩹",
		ltimes: "⋉",
		ltlarr: "⥶",
		ltquest: "⩻",
		ltrPar: "⦖",
		ltri: "◃",
		triangleleft: "◃",
		lurdshar: "⥊",
		luruhar: "⥦",
		lvertneqq: "≨︀",
		lvnE: "≨︀",
		mDDot: "∺",
		macr: "¯",
		strns: "¯",
		male: "♂",
		malt: "✠",
		maltese: "✠",
		marker: "▮",
		mcomma: "⨩",
		mcy: "м",
		mdash: "—",
		mfr: "𝔪",
		mho: "℧",
		micro: "µ",
		midcir: "⫰",
		minus: "−",
		minusdu: "⨪",
		mlcp: "⫛",
		models: "⊧",
		mopf: "𝕞",
		mscr: "𝓂",
		mu: "μ",
		multimap: "⊸",
		mumap: "⊸",
		nGg: "⋙̸",
		nGt: "≫⃒",
		nLeftarrow: "⇍",
		nlArr: "⇍",
		nLeftrightarrow: "⇎",
		nhArr: "⇎",
		nLl: "⋘̸",
		nLt: "≪⃒",
		nRightarrow: "⇏",
		nrArr: "⇏",
		nVDash: "⊯",
		nVdash: "⊮",
		nacute: "ń",
		nang: "∠⃒",
		napE: "⩰̸",
		napid: "≋̸",
		napos: "ŉ",
		natur: "♮",
		natural: "♮",
		ncap: "⩃",
		ncaron: "ň",
		ncedil: "ņ",
		ncongdot: "⩭̸",
		ncup: "⩂",
		ncy: "н",
		ndash: "–",
		neArr: "⇗",
		nearhk: "⤤",
		nedot: "≐̸",
		nesear: "⤨",
		toea: "⤨",
		nfr: "𝔫",
		nharr: "↮",
		nleftrightarrow: "↮",
		nhpar: "⫲",
		nis: "⋼",
		nisd: "⋺",
		njcy: "њ",
		nlE: "≦̸",
		nleqq: "≦̸",
		nlarr: "↚",
		nleftarrow: "↚",
		nldr: "‥",
		nopf: "𝕟",
		not: "¬",
		notinE: "⋹̸",
		notindot: "⋵̸",
		notinvb: "⋷",
		notinvc: "⋶",
		notnivb: "⋾",
		notnivc: "⋽",
		nparsl: "⫽⃥",
		npart: "∂̸",
		npolint: "⨔",
		nrarr: "↛",
		nrightarrow: "↛",
		nrarrc: "⤳̸",
		nrarrw: "↝̸",
		nscr: "𝓃",
		nsub: "⊄",
		nsubE: "⫅̸",
		nsubseteqq: "⫅̸",
		nsup: "⊅",
		nsupE: "⫆̸",
		nsupseteqq: "⫆̸",
		ntilde: "ñ",
		nu: "ν",
		num: "#",
		numero: "№",
		numsp: " ",
		nvDash: "⊭",
		nvHarr: "⤄",
		nvap: "≍⃒",
		nvdash: "⊬",
		nvge: "≥⃒",
		nvgt: ">⃒",
		nvinfin: "⧞",
		nvlArr: "⤂",
		nvle: "≤⃒",
		nvlt: "<⃒",
		nvltrie: "⊴⃒",
		nvrArr: "⤃",
		nvrtrie: "⊵⃒",
		nvsim: "∼⃒",
		nwArr: "⇖",
		nwarhk: "⤣",
		nwnear: "⤧",
		oacute: "ó",
		ocirc: "ô",
		ocy: "о",
		odblac: "ő",
		odiv: "⨸",
		odsold: "⦼",
		oelig: "œ",
		ofcir: "⦿",
		ofr: "𝔬",
		ogon: "˛",
		ograve: "ò",
		ogt: "⧁",
		ohbar: "⦵",
		olcir: "⦾",
		olcross: "⦻",
		olt: "⧀",
		omacr: "ō",
		omega: "ω",
		omicron: "ο",
		omid: "⦶",
		oopf: "𝕠",
		opar: "⦷",
		operp: "⦹",
		or: "∨",
		vee: "∨",
		ord: "⩝",
		order: "ℴ",
		orderof: "ℴ",
		oscr: "ℴ",
		ordf: "ª",
		ordm: "º",
		origof: "⊶",
		oror: "⩖",
		orslope: "⩗",
		orv: "⩛",
		oslash: "ø",
		osol: "⊘",
		otilde: "õ",
		otimesas: "⨶",
		ouml: "ö",
		ovbar: "⌽",
		para: "¶",
		parsim: "⫳",
		parsl: "⫽",
		pcy: "п",
		percnt: "%",
		period: ".",
		permil: "‰",
		pertenk: "‱",
		pfr: "𝔭",
		phi: "φ",
		phiv: "ϕ",
		straightphi: "ϕ",
		varphi: "ϕ",
		phone: "☎",
		pi: "π",
		piv: "ϖ",
		varpi: "ϖ",
		planckh: "ℎ",
		plus: "+",
		plusacir: "⨣",
		pluscir: "⨢",
		plusdu: "⨥",
		pluse: "⩲",
		plussim: "⨦",
		plustwo: "⨧",
		pointint: "⨕",
		popf: "𝕡",
		pound: "£",
		prE: "⪳",
		prap: "⪷",
		precapprox: "⪷",
		precnapprox: "⪹",
		prnap: "⪹",
		precneqq: "⪵",
		prnE: "⪵",
		precnsim: "⋨",
		prnsim: "⋨",
		prime: "′",
		profalar: "⌮",
		profline: "⌒",
		profsurf: "⌓",
		prurel: "⊰",
		pscr: "𝓅",
		psi: "ψ",
		puncsp: " ",
		qfr: "𝔮",
		qopf: "𝕢",
		qprime: "⁗",
		qscr: "𝓆",
		quatint: "⨖",
		quest: "?",
		rAtail: "⤜",
		rHar: "⥤",
		race: "∽̱",
		racute: "ŕ",
		raemptyv: "⦳",
		rangd: "⦒",
		range: "⦥",
		raquo: "»",
		rarrap: "⥵",
		rarrbfs: "⤠",
		rarrc: "⤳",
		rarrfs: "⤞",
		rarrpl: "⥅",
		rarrsim: "⥴",
		rarrtl: "↣",
		rightarrowtail: "↣",
		rarrw: "↝",
		rightsquigarrow: "↝",
		ratail: "⤚",
		ratio: "∶",
		rbbrk: "❳",
		rbrace: "}",
		rcub: "}",
		rbrack: "]",
		rsqb: "]",
		rbrke: "⦌",
		rbrksld: "⦎",
		rbrkslu: "⦐",
		rcaron: "ř",
		rcedil: "ŗ",
		rcy: "р",
		rdca: "⤷",
		rdldhar: "⥩",
		rdsh: "↳",
		rect: "▭",
		rfisht: "⥽",
		rfr: "𝔯",
		rharul: "⥬",
		rho: "ρ",
		rhov: "ϱ",
		varrho: "ϱ",
		rightrightarrows: "⇉",
		rrarr: "⇉",
		rightthreetimes: "⋌",
		rthree: "⋌",
		ring: "˚",
		rlm: "‏",
		rmoust: "⎱",
		rmoustache: "⎱",
		rnmid: "⫮",
		roang: "⟭",
		roarr: "⇾",
		ropar: "⦆",
		ropf: "𝕣",
		roplus: "⨮",
		rotimes: "⨵",
		rpar: ")",
		rpargt: "⦔",
		rppolint: "⨒",
		rsaquo: "›",
		rscr: "𝓇",
		rtimes: "⋊",
		rtri: "▹",
		triangleright: "▹",
		rtriltri: "⧎",
		ruluhar: "⥨",
		rx: "℞",
		sacute: "ś",
		scE: "⪴",
		scap: "⪸",
		succapprox: "⪸",
		scaron: "š",
		scedil: "ş",
		scirc: "ŝ",
		scnE: "⪶",
		succneqq: "⪶",
		scnap: "⪺",
		succnapprox: "⪺",
		scnsim: "⋩",
		succnsim: "⋩",
		scpolint: "⨓",
		scy: "с",
		sdot: "⋅",
		sdote: "⩦",
		seArr: "⇘",
		sect: "§",
		semi: ";",
		seswar: "⤩",
		tosa: "⤩",
		sext: "✶",
		sfr: "𝔰",
		sharp: "♯",
		shchcy: "щ",
		shcy: "ш",
		shy: "­",
		sigma: "σ",
		sigmaf: "ς",
		sigmav: "ς",
		varsigma: "ς",
		simdot: "⩪",
		simg: "⪞",
		simgE: "⪠",
		siml: "⪝",
		simlE: "⪟",
		simne: "≆",
		simplus: "⨤",
		simrarr: "⥲",
		smashp: "⨳",
		smeparsl: "⧤",
		smile: "⌣",
		ssmile: "⌣",
		smt: "⪪",
		smte: "⪬",
		smtes: "⪬︀",
		softcy: "ь",
		sol: "/",
		solb: "⧄",
		solbar: "⌿",
		sopf: "𝕤",
		spades: "♠",
		spadesuit: "♠",
		sqcaps: "⊓︀",
		sqcups: "⊔︀",
		sscr: "𝓈",
		star: "☆",
		sub: "⊂",
		subset: "⊂",
		subE: "⫅",
		subseteqq: "⫅",
		subdot: "⪽",
		subedot: "⫃",
		submult: "⫁",
		subnE: "⫋",
		subsetneqq: "⫋",
		subne: "⊊",
		subsetneq: "⊊",
		subplus: "⪿",
		subrarr: "⥹",
		subsim: "⫇",
		subsub: "⫕",
		subsup: "⫓",
		sung: "♪",
		sup1: "¹",
		sup2: "²",
		sup3: "³",
		supE: "⫆",
		supseteqq: "⫆",
		supdot: "⪾",
		supdsub: "⫘",
		supedot: "⫄",
		suphsol: "⟉",
		suphsub: "⫗",
		suplarr: "⥻",
		supmult: "⫂",
		supnE: "⫌",
		supsetneqq: "⫌",
		supne: "⊋",
		supsetneq: "⊋",
		supplus: "⫀",
		supsim: "⫈",
		supsub: "⫔",
		supsup: "⫖",
		swArr: "⇙",
		swnwar: "⤪",
		szlig: "ß",
		target: "⌖",
		tau: "τ",
		tcaron: "ť",
		tcedil: "ţ",
		tcy: "т",
		telrec: "⌕",
		tfr: "𝔱",
		theta: "θ",
		thetasym: "ϑ",
		thetav: "ϑ",
		vartheta: "ϑ",
		thorn: "þ",
		times: "×",
		timesbar: "⨱",
		timesd: "⨰",
		topbot: "⌶",
		topcir: "⫱",
		topf: "𝕥",
		topfork: "⫚",
		tprime: "‴",
		triangle: "▵",
		utri: "▵",
		triangleq: "≜",
		trie: "≜",
		tridot: "◬",
		triminus: "⨺",
		triplus: "⨹",
		trisb: "⧍",
		tritime: "⨻",
		trpezium: "⏢",
		tscr: "𝓉",
		tscy: "ц",
		tshcy: "ћ",
		tstrok: "ŧ",
		uHar: "⥣",
		uacute: "ú",
		ubrcy: "ў",
		ubreve: "ŭ",
		ucirc: "û",
		ucy: "у",
		udblac: "ű",
		ufisht: "⥾",
		ufr: "𝔲",
		ugrave: "ù",
		uhblk: "▀",
		ulcorn: "⌜",
		ulcorner: "⌜",
		ulcrop: "⌏",
		ultri: "◸",
		umacr: "ū",
		uogon: "ų",
		uopf: "𝕦",
		upsi: "υ",
		upsilon: "υ",
		upuparrows: "⇈",
		uuarr: "⇈",
		urcorn: "⌝",
		urcorner: "⌝",
		urcrop: "⌎",
		uring: "ů",
		urtri: "◹",
		uscr: "𝓊",
		utdot: "⋰",
		utilde: "ũ",
		uuml: "ü",
		uwangle: "⦧",
		vBar: "⫨",
		vBarv: "⫩",
		vangrt: "⦜",
		varsubsetneq: "⊊︀",
		vsubne: "⊊︀",
		varsubsetneqq: "⫋︀",
		vsubnE: "⫋︀",
		varsupsetneq: "⊋︀",
		vsupne: "⊋︀",
		varsupsetneqq: "⫌︀",
		vsupnE: "⫌︀",
		vcy: "в",
		veebar: "⊻",
		veeeq: "≚",
		vellip: "⋮",
		vfr: "𝔳",
		vopf: "𝕧",
		vscr: "𝓋",
		vzigzag: "⦚",
		wcirc: "ŵ",
		wedbar: "⩟",
		wedgeq: "≙",
		weierp: "℘",
		wp: "℘",
		wfr: "𝔴",
		wopf: "𝕨",
		wscr: "𝓌",
		xfr: "𝔵",
		xi: "ξ",
		xnis: "⋻",
		xopf: "𝕩",
		xscr: "𝓍",
		yacute: "ý",
		yacy: "я",
		ycirc: "ŷ",
		ycy: "ы",
		yen: "¥",
		yfr: "𝔶",
		yicy: "ї",
		yopf: "𝕪",
		yscr: "𝓎",
		yucy: "ю",
		yuml: "ÿ",
		zacute: "ź",
		zcaron: "ž",
		zcy: "з",
		zdot: "ż",
		zeta: "ζ",
		zfr: "𝔷",
		zhcy: "ж",
		zigrarr: "⇝",
		zopf: "𝕫",
		zscr: "𝓏",
		zwj: "‍",
		zwnj: "‌"
	};
	_e.ngsp = "";
	l = (function(e) {
		return e[e.TAG_OPEN_START = 0] = "TAG_OPEN_START", e[e.TAG_OPEN_END = 1] = "TAG_OPEN_END", e[e.TAG_OPEN_END_VOID = 2] = "TAG_OPEN_END_VOID", e[e.TAG_CLOSE = 3] = "TAG_CLOSE", e[e.INCOMPLETE_TAG_OPEN = 4] = "INCOMPLETE_TAG_OPEN", e[e.TEXT = 5] = "TEXT", e[e.ESCAPABLE_RAW_TEXT = 6] = "ESCAPABLE_RAW_TEXT", e[e.RAW_TEXT = 7] = "RAW_TEXT", e[e.INTERPOLATION = 8] = "INTERPOLATION", e[e.ENCODED_ENTITY = 9] = "ENCODED_ENTITY", e[e.COMMENT_START = 10] = "COMMENT_START", e[e.COMMENT_END = 11] = "COMMENT_END", e[e.CDATA_START = 12] = "CDATA_START", e[e.CDATA_END = 13] = "CDATA_END", e[e.ATTR_NAME = 14] = "ATTR_NAME", e[e.ATTR_QUOTE = 15] = "ATTR_QUOTE", e[e.ATTR_VALUE_TEXT = 16] = "ATTR_VALUE_TEXT", e[e.ATTR_VALUE_INTERPOLATION = 17] = "ATTR_VALUE_INTERPOLATION", e[e.DOC_TYPE_START = 18] = "DOC_TYPE_START", e[e.DOC_TYPE_END = 19] = "DOC_TYPE_END", e[e.EXPANSION_FORM_START = 20] = "EXPANSION_FORM_START", e[e.EXPANSION_CASE_VALUE = 21] = "EXPANSION_CASE_VALUE", e[e.EXPANSION_CASE_EXP_START = 22] = "EXPANSION_CASE_EXP_START", e[e.EXPANSION_CASE_EXP_END = 23] = "EXPANSION_CASE_EXP_END", e[e.EXPANSION_FORM_END = 24] = "EXPANSION_FORM_END", e[e.BLOCK_OPEN_START = 25] = "BLOCK_OPEN_START", e[e.BLOCK_OPEN_END = 26] = "BLOCK_OPEN_END", e[e.BLOCK_CLOSE = 27] = "BLOCK_CLOSE", e[e.BLOCK_PARAMETER = 28] = "BLOCK_PARAMETER", e[e.INCOMPLETE_BLOCK_OPEN = 29] = "INCOMPLETE_BLOCK_OPEN", e[e.LET_START = 30] = "LET_START", e[e.LET_VALUE = 31] = "LET_VALUE", e[e.LET_END = 32] = "LET_END", e[e.INCOMPLETE_LET = 33] = "INCOMPLETE_LET", e[e.COMPONENT_OPEN_START = 34] = "COMPONENT_OPEN_START", e[e.COMPONENT_OPEN_END = 35] = "COMPONENT_OPEN_END", e[e.COMPONENT_OPEN_END_VOID = 36] = "COMPONENT_OPEN_END_VOID", e[e.COMPONENT_CLOSE = 37] = "COMPONENT_CLOSE", e[e.INCOMPLETE_COMPONENT_OPEN = 38] = "INCOMPLETE_COMPONENT_OPEN", e[e.DIRECTIVE_NAME = 39] = "DIRECTIVE_NAME", e[e.DIRECTIVE_OPEN = 40] = "DIRECTIVE_OPEN", e[e.DIRECTIVE_CLOSE = 41] = "DIRECTIVE_CLOSE", e[e.EOF = 42] = "EOF", e;
	})({});
	qa = class {
		constructor(e, t, r) {
			this.tokens = e, this.errors = t, this.nonNormalizedIcuExpressions = r;
		}
	};
	Fa = /\r\n?/g;
	gr = (function(e) {
		return e.HEX = "hexadecimal", e.DEC = "decimal", e;
	})(gr || {}), Va = [
		"@if",
		"@else",
		"@for",
		"@switch",
		"@case",
		"@default",
		"@empty",
		"@defer",
		"@placeholder",
		"@loading",
		"@error"
	], st = {
		start: "{{",
		end: "}}"
	}, Ua = class {
		_cursor;
		_tokenizeIcu;
		_leadingTriviaCodePoints;
		_canSelfClose;
		_allowHtmComponentClosingTags;
		_currentTokenStart = null;
		_currentTokenType = null;
		_expansionCaseStack = [];
		_openDirectiveCount = 0;
		_inInterpolation = !1;
		_preserveLineEndings;
		_i18nNormalizeLineEndingsInICUs;
		_fullNameStack = [];
		_tokenizeBlocks;
		_tokenizeLet;
		_selectorlessEnabled;
		tokens = [];
		errors = [];
		nonNormalizedIcuExpressions = [];
		constructor(e, t, r) {
			this._getTagContentType = t, this._tokenizeIcu = r.tokenizeExpansionForms || !1, this._leadingTriviaCodePoints = r.leadingTriviaChars && r.leadingTriviaChars.map((i) => i.codePointAt(0) || 0), this._canSelfClose = r.canSelfClose || !1, this._allowHtmComponentClosingTags = r.allowHtmComponentClosingTags || !1;
			let n = r.range || {
				endPos: e.content.length,
				startPos: 0,
				startLine: 0,
				startCol: 0
			};
			this._cursor = r.escapedString ? new Ka(e, n) : new Oi(e, n), this._preserveLineEndings = r.preserveLineEndings || !1, this._i18nNormalizeLineEndingsInICUs = r.i18nNormalizeLineEndingsInICUs || !1, this._tokenizeBlocks = r.tokenizeBlocks ?? !0, this._tokenizeLet = r.tokenizeLet ?? !0, this._selectorlessEnabled = r.selectorlessEnabled ?? !1;
			try {
				this._cursor.init();
			} catch (i) {
				this.handleError(i);
			}
		}
		_processCarriageReturns(e) {
			return this._preserveLineEndings ? e : e.replace(Fa, `
`);
		}
		tokenize() {
			for (; this._cursor.peek() !== 0;) {
				let e = this._cursor.clone();
				try {
					if (this._attemptCharCode(60)) if (this._attemptCharCode(33)) this._attemptStr("[CDATA[") ? this._consumeCdata(e) : this._attemptStr("--") ? this._consumeComment(e) : this._attemptStrCaseInsensitive("doctype") ? this._consumeDocType(e) : this._consumeBogusComment(e);
					else if (this._attemptCharCode(47)) this._consumeTagClose(e);
					else {
						let t = this._cursor.clone();
						this._attemptCharCode(63) ? (this._cursor = t, this._consumeBogusComment(e)) : this._consumeTagOpen(e);
					}
					else this._tokenizeLet && this._cursor.peek() === 64 && !this._inInterpolation && this._isLetStart() ? this._consumeLetDeclaration(e) : this._tokenizeBlocks && this._isBlockStart() ? this._consumeBlockStart(e) : this._tokenizeBlocks && !this._inInterpolation && !this._isInExpansionCase() && !this._isInExpansionForm() && this._attemptCharCode(125) ? this._consumeBlockEnd(e) : this._tokenizeIcu && this._tokenizeExpansionForm() || this._consumeWithInterpolation(l.TEXT, l.INTERPOLATION, () => this._isTextEnd(), () => this._isTagStart());
				} catch (t) {
					this.handleError(t);
				}
			}
			this._beginToken(l.EOF), this._endToken([]);
		}
		_getBlockName() {
			let e = !1, t = this._cursor.clone();
			return this._attemptCharCodeUntilFn((r) => it(r) ? !e : ja(r) ? (e = !0, !1) : !0), this._cursor.getChars(t).trim();
		}
		_consumeBlockStart(e) {
			this._requireCharCode(64), this._beginToken(l.BLOCK_OPEN_START, e);
			let t = this._endToken([this._getBlockName()]);
			if (this._cursor.peek() === 40) if (this._cursor.advance(), this._consumeBlockParameters(), this._attemptCharCodeUntilFn(v), this._attemptCharCode(41)) this._attemptCharCodeUntilFn(v);
			else {
				t.type = l.INCOMPLETE_BLOCK_OPEN;
				return;
			}
			if (t.parts[0] === "default never" && this._attemptCharCode(59)) {
				this._beginToken(l.BLOCK_OPEN_END), this._endToken([]), this._beginToken(l.BLOCK_CLOSE), this._endToken([]);
				return;
			}
			this._attemptCharCode(123) ? (this._beginToken(l.BLOCK_OPEN_END), this._endToken([])) : this._isBlockStart() && (t.parts[0] === "case" || t.parts[0] === "default") ? (this._beginToken(l.BLOCK_OPEN_END), this._endToken([]), this._beginToken(l.BLOCK_CLOSE), this._endToken([])) : t.type = l.INCOMPLETE_BLOCK_OPEN;
		}
		_consumeBlockEnd(e) {
			this._beginToken(l.BLOCK_CLOSE, e), this._endToken([]);
		}
		_consumeBlockParameters() {
			for (this._attemptCharCodeUntilFn(Ai); this._cursor.peek() !== 41 && this._cursor.peek() !== 0;) {
				this._beginToken(l.BLOCK_PARAMETER);
				let e = this._cursor.clone(), t = null, r = 0;
				for (; this._cursor.peek() !== 59 && this._cursor.peek() !== 0 || t !== null;) {
					let n = this._cursor.peek();
					if (n === 92) this._cursor.advance();
					else if (n === t) t = null;
					else if (t === null && Dt(n)) t = n;
					else if (n === 40 && t === null) r++;
					else if (n === 41 && t === null) {
						if (r === 0) break;
						r > 0 && r--;
					}
					this._cursor.advance();
				}
				this._endToken([this._cursor.getChars(e)]), this._attemptCharCodeUntilFn(Ai);
			}
		}
		_consumeLetDeclaration(e) {
			if (this._requireStr("@let"), this._beginToken(l.LET_START, e), it(this._cursor.peek())) this._attemptCharCodeUntilFn(v);
			else {
				let r = this._endToken([this._cursor.getChars(e)]);
				r.type = l.INCOMPLETE_LET;
				return;
			}
			let t = this._endToken([this._getLetDeclarationName()]);
			if (this._attemptCharCodeUntilFn(v), !this._attemptCharCode(61)) {
				t.type = l.INCOMPLETE_LET;
				return;
			}
			this._attemptCharCodeUntilFn((r) => v(r) && !Me(r)), this._consumeLetDeclarationValue(), this._cursor.peek() === 59 ? (this._beginToken(l.LET_END), this._endToken([]), this._cursor.advance()) : (t.type = l.INCOMPLETE_LET, t.sourceSpan = this._cursor.getSpan(e));
		}
		_getLetDeclarationName() {
			let e = this._cursor.clone(), t = !1;
			return this._attemptCharCodeUntilFn((r) => Re(r) || r === 36 || r === 95 || t && Ie(r) ? (t = !0, !1) : !0), this._cursor.getChars(e).trim();
		}
		_consumeLetDeclarationValue() {
			let e = this._cursor.clone();
			for (this._beginToken(l.LET_VALUE, e); this._cursor.peek() !== 0;) {
				let t = this._cursor.peek();
				if (t === 59) break;
				Dt(t) && (this._cursor.advance(), this._attemptCharCodeUntilFn((r) => r === 92 ? (this._cursor.advance(), !1) : r === t)), this._cursor.advance();
			}
			this._endToken([this._cursor.getChars(e)]);
		}
		_tokenizeExpansionForm() {
			if (this.isExpansionFormStart()) return this._consumeExpansionFormStart(), !0;
			if ($a(this._cursor.peek()) && this._isInExpansionForm()) return this._consumeExpansionCaseStart(), !0;
			if (this._cursor.peek() === 125) {
				if (this._isInExpansionCase()) return this._consumeExpansionCaseEnd(), !0;
				if (this._isInExpansionForm()) return this._consumeExpansionFormEnd(), !0;
			}
			return !1;
		}
		_beginToken(e, t = this._cursor.clone()) {
			this._currentTokenStart = t, this._currentTokenType = e;
		}
		_endToken(e, t) {
			if (this._currentTokenStart === null) throw new ee(this._cursor.getSpan(t), "Programming error - attempted to end a token when there was no start to the token");
			if (this._currentTokenType === null) throw new ee(this._cursor.getSpan(this._currentTokenStart), "Programming error - attempted to end a token which has no token type");
			let r = {
				type: this._currentTokenType,
				parts: e,
				sourceSpan: (t ?? this._cursor).getSpan(this._currentTokenStart, this._leadingTriviaCodePoints)
			};
			return this.tokens.push(r), this._currentTokenStart = null, this._currentTokenType = null, r;
		}
		_createError(e, t) {
			this._isInExpansionForm() && (e += ` (Do you have an unescaped "{" in your template? Use "{{ '{' }}") to escape it.)`);
			let r = new ee(t, e);
			return this._currentTokenStart = null, this._currentTokenType = null, r;
		}
		handleError(e) {
			if (e instanceof Er && (e = this._createError(e.msg, this._cursor.getSpan(e.cursor))), e instanceof ee) this.errors.push(e);
			else throw e;
		}
		_attemptCharCode(e) {
			return this._cursor.peek() === e ? (this._cursor.advance(), !0) : !1;
		}
		_attemptCharCodeCaseInsensitive(e) {
			return Ya(this._cursor.peek(), e) ? (this._cursor.advance(), !0) : !1;
		}
		_requireCharCode(e) {
			let t = this._cursor.clone();
			if (!this._attemptCharCode(e)) throw this._createError(Se(this._cursor.peek()), this._cursor.getSpan(t));
		}
		_attemptStr(e) {
			let t = e.length;
			if (this._cursor.charsLeft() < t) return !1;
			let r = this._cursor.clone();
			for (let n = 0; n < t; n++) if (!this._attemptCharCode(e.charCodeAt(n))) return this._cursor = r, !1;
			return !0;
		}
		_attemptStrCaseInsensitive(e) {
			for (let t = 0; t < e.length; t++) if (!this._attemptCharCodeCaseInsensitive(e.charCodeAt(t))) return !1;
			return !0;
		}
		_requireStr(e) {
			let t = this._cursor.clone();
			if (!this._attemptStr(e)) throw this._createError(Se(this._cursor.peek()), this._cursor.getSpan(t));
		}
		_requireStrCaseInsensitive(e) {
			let t = this._cursor.clone();
			if (!this._attemptStrCaseInsensitive(e)) throw this._createError(Se(this._cursor.peek()), this._cursor.getSpan(t));
		}
		_attemptCharCodeUntilFn(e) {
			for (; !e(this._cursor.peek());) this._cursor.advance();
		}
		_requireCharCodeUntilFn(e, t) {
			let r = this._cursor.clone();
			if (this._attemptCharCodeUntilFn(e), this._cursor.diff(r) < t) throw this._createError(Se(this._cursor.peek()), this._cursor.getSpan(r));
		}
		_attemptUntilChar(e) {
			for (; this._cursor.peek() !== e;) this._cursor.advance();
		}
		_readChar() {
			let e = String.fromCodePoint(this._cursor.peek());
			return this._cursor.advance(), e;
		}
		_peekStr(e) {
			let t = e.length;
			if (this._cursor.charsLeft() < t) return !1;
			let r = this._cursor.clone();
			for (let n = 0; n < t; n++) {
				if (r.peek() !== e.charCodeAt(n)) return !1;
				r.advance();
			}
			return !0;
		}
		_isBlockStart() {
			return this._cursor.peek() === 64 && Va.some((e) => this._peekStr(e));
		}
		_isLetStart() {
			return this._cursor.peek() === 64 && this._peekStr("@let");
		}
		_consumeEntity(e) {
			this._beginToken(l.ENCODED_ENTITY);
			let t = this._cursor.clone();
			if (this._cursor.advance(), this._attemptCharCode(35)) {
				let r = this._attemptCharCode(120) || this._attemptCharCode(88), n = this._cursor.clone();
				if (this._attemptCharCodeUntilFn(Ga), this._cursor.peek() != 59) {
					this._cursor.advance();
					let s = r ? gr.HEX : gr.DEC;
					throw this._createError(Ha(s, this._cursor.getChars(t)), this._cursor.getSpan());
				}
				let i = this._cursor.getChars(n);
				this._cursor.advance();
				try {
					let s = parseInt(i, r ? 16 : 10);
					this._endToken([String.fromCodePoint(s), this._cursor.getChars(t)]);
				} catch {
					throw this._createError(xi(this._cursor.getChars(t)), this._cursor.getSpan());
				}
			} else {
				let r = this._cursor.clone();
				if (this._attemptCharCodeUntilFn(za), this._cursor.peek() != 59) this._beginToken(e, t), this._cursor = r, this._endToken(["&"]);
				else {
					let n = this._cursor.getChars(r);
					this._cursor.advance();
					let i = _e.hasOwnProperty(n) && _e[n];
					if (!i) throw this._createError(xi(n), this._cursor.getSpan(t));
					this._endToken([i, `&${n};`]);
				}
			}
		}
		_consumeRawText(e, t) {
			this._beginToken(e ? l.ESCAPABLE_RAW_TEXT : l.RAW_TEXT);
			let r = [];
			for (;;) {
				let n = this._cursor.clone(), i = t();
				if (this._cursor = n, i) break;
				e && this._cursor.peek() === 38 ? (this._endToken([this._processCarriageReturns(r.join(""))]), r.length = 0, this._consumeEntity(l.ESCAPABLE_RAW_TEXT), this._beginToken(l.ESCAPABLE_RAW_TEXT)) : r.push(this._readChar());
			}
			this._endToken([this._processCarriageReturns(r.join(""))]);
		}
		_consumeComment(e) {
			this._beginToken(l.COMMENT_START, e), this._endToken([]), this._consumeRawText(!1, () => this._attemptStr("-->")), this._beginToken(l.COMMENT_END), this._requireStr("-->"), this._endToken([]);
		}
		_consumeBogusComment(e) {
			this._beginToken(l.COMMENT_START, e), this._endToken([]), this._consumeRawText(!1, () => this._cursor.peek() === 62), this._beginToken(l.COMMENT_END), this._cursor.advance(), this._endToken([]);
		}
		_consumeCdata(e) {
			this._beginToken(l.CDATA_START, e), this._endToken([]), this._consumeRawText(!1, () => this._attemptStr("]]>")), this._beginToken(l.CDATA_END), this._requireStr("]]>"), this._endToken([]);
		}
		_consumeDocType(e) {
			this._beginToken(l.DOC_TYPE_START, e), this._endToken([]), this._consumeRawText(!1, () => this._cursor.peek() === 62), this._beginToken(l.DOC_TYPE_END), this._cursor.advance(), this._endToken([]);
		}
		_consumePrefixAndName(e) {
			let t = this._cursor.clone(), r = "";
			for (; this._cursor.peek() !== 58 && !Wa(this._cursor.peek());) this._cursor.advance();
			let n;
			this._cursor.peek() === 58 ? (r = this._cursor.getChars(t), this._cursor.advance(), n = this._cursor.clone()) : n = t, this._requireCharCodeUntilFn(e, r === "" ? 0 : 1);
			let i = this._cursor.getChars(n);
			return [r, i];
		}
		_consumeSingleLineComment() {
			this._attemptCharCodeUntilFn((e) => Me(e) || e === 0), this._attemptCharCodeUntilFn(v);
		}
		_consumeMultiLineComment() {
			this._attemptCharCodeUntilFn((e) => {
				if (e === 0) return !0;
				if (e === 42) {
					let t = this._cursor.clone();
					return t.advance(), t.peek() === 47;
				}
				return !1;
			}), this._attemptStr("*/") && this._attemptCharCodeUntilFn(v);
		}
		_consumeTagOpen(e) {
			let t, r, n, i, s = [];
			try {
				if (this._selectorlessEnabled && It(this._cursor.peek())) i = this._consumeComponentOpenStart(e), [n, r, t] = i.parts, r && (n += `:${r}`), t && (n += `:${t}`), this._attemptCharCodeUntilFn(v);
				else {
					if (!Re(this._cursor.peek())) throw this._createError(Se(this._cursor.peek()), this._cursor.getSpan(e));
					i = this._consumeTagOpenStart(e), r = i.parts[0], t = n = i.parts[1], this._attemptCharCodeUntilFn(v);
				}
				for (;;) {
					if (this._attemptStr("//")) {
						this._consumeSingleLineComment();
						continue;
					}
					if (this._attemptStr("/*")) {
						this._consumeMultiLineComment();
						continue;
					}
					if (Li(this._cursor.peek())) break;
					if (this._selectorlessEnabled && this._cursor.peek() === 64) {
						let o = this._cursor.clone(), c = o.clone();
						c.advance(), It(c.peek()) && this._consumeDirective(o, c);
					} else {
						let o = this._consumeAttribute();
						s.push(o);
					}
				}
				i.type === l.COMPONENT_OPEN_START ? this._consumeComponentOpenEnd() : this._consumeTagOpenEnd();
			} catch (o) {
				if (o instanceof ee) {
					i ? i.type = i.type === l.COMPONENT_OPEN_START ? l.INCOMPLETE_COMPONENT_OPEN : l.INCOMPLETE_TAG_OPEN : (this._beginToken(l.TEXT, e), this._endToken(["<"]));
					return;
				}
				throw o;
			}
			if (this._canSelfClose && this.tokens[this.tokens.length - 1].type === l.TAG_OPEN_END_VOID) return;
			let a = this._getTagContentType(t, r, this._fullNameStack.length > 0, s);
			this._handleFullNameStackForTagOpen(r, t), a === R.RAW_TEXT ? this._consumeRawTextWithTagClose(r, i, n, !1) : a === R.ESCAPABLE_RAW_TEXT && this._consumeRawTextWithTagClose(r, i, n, !0);
		}
		_consumeRawTextWithTagClose(e, t, r, n) {
			this._consumeRawText(n, () => !this._attemptCharCode(60) || !this._attemptCharCode(47) || (this._attemptCharCodeUntilFn(v), !this._attemptStrCaseInsensitive(e && t.type !== l.COMPONENT_OPEN_START ? `${e}:${r}` : r)) ? !1 : (this._attemptCharCodeUntilFn(v), this._attemptCharCode(62))), this._beginToken(t.type === l.COMPONENT_OPEN_START ? l.COMPONENT_CLOSE : l.TAG_CLOSE), this._requireCharCodeUntilFn((i) => i === 62, 3), this._cursor.advance(), this._endToken(t.parts), this._handleFullNameStackForTagClose(e, r);
		}
		_consumeTagOpenStart(e) {
			this._beginToken(l.TAG_OPEN_START, e);
			let t = this._consumePrefixAndName(Ee);
			return this._endToken(t);
		}
		_consumeComponentOpenStart(e) {
			this._beginToken(l.COMPONENT_OPEN_START, e);
			let t = this._consumeComponentName();
			return this._endToken(t);
		}
		_consumeComponentName() {
			let e = this._cursor.clone();
			for (; Ni(this._cursor.peek());) this._cursor.advance();
			let t = this._cursor.getChars(e), r = "", n = "";
			return this._cursor.peek() === 58 && (this._cursor.advance(), [r, n] = this._consumePrefixAndName(Ee)), [
				t,
				r,
				n
			];
		}
		_consumeAttribute() {
			let [e, t] = this._consumeAttributeName(), r;
			return this._attemptCharCodeUntilFn(v), this._attemptCharCode(61) && (this._attemptCharCodeUntilFn(v), r = this._consumeAttributeValue()), this._attemptCharCodeUntilFn(v), {
				prefix: e,
				name: t,
				value: r
			};
		}
		_consumeAttributeName() {
			let e = this._cursor.peek();
			if (e === 39 || e === 34) throw this._createError(Se(e), this._cursor.getSpan());
			this._beginToken(l.ATTR_NAME);
			let t;
			if (this._openDirectiveCount > 0) {
				let n = 0;
				t = (i) => {
					if (this._openDirectiveCount > 0) {
						if (i === 40) n++;
						else if (i === 41) {
							if (n === 0) return !0;
							n--;
						}
					}
					return Ee(i);
				};
			} else if (e === 91) {
				let n = 0;
				t = (i) => (i === 91 ? n++ : i === 93 && n--, n <= 0 ? Ee(i) : Me(i));
			} else t = Ee;
			let r = this._consumePrefixAndName(t);
			return this._endToken(r), r;
		}
		_consumeAttributeValue() {
			let e;
			if (this._cursor.peek() === 39 || this._cursor.peek() === 34) {
				let t = this._cursor.peek();
				this._consumeQuote(t);
				let r = () => this._cursor.peek() === t;
				e = this._consumeWithInterpolation(l.ATTR_VALUE_TEXT, l.ATTR_VALUE_INTERPOLATION, r, r), this._consumeQuote(t);
			} else {
				let t = () => Ee(this._cursor.peek());
				e = this._consumeWithInterpolation(l.ATTR_VALUE_TEXT, l.ATTR_VALUE_INTERPOLATION, t, t);
			}
			return e;
		}
		_consumeQuote(e) {
			this._beginToken(l.ATTR_QUOTE), this._requireCharCode(e), this._endToken([String.fromCodePoint(e)]);
		}
		_consumeTagOpenEnd() {
			let e = this._attemptCharCode(47) ? l.TAG_OPEN_END_VOID : l.TAG_OPEN_END;
			this._beginToken(e), this._requireCharCode(62), this._endToken([]);
		}
		_consumeComponentOpenEnd() {
			let e = this._attemptCharCode(47) ? l.COMPONENT_OPEN_END_VOID : l.COMPONENT_OPEN_END;
			this._beginToken(e), this._requireCharCode(62), this._endToken([]);
		}
		_consumeTagClose(e) {
			if (this._selectorlessEnabled) {
				let t = e.clone();
				for (; t.peek() !== 62 && !It(t.peek());) t.advance();
				if (It(t.peek())) {
					this._beginToken(l.COMPONENT_CLOSE, e);
					let r = this._consumeComponentName();
					this._attemptCharCodeUntilFn(v), this._requireCharCode(62), this._endToken(r);
					return;
				}
			}
			if (this._beginToken(l.TAG_CLOSE, e), this._attemptCharCodeUntilFn(v), this._allowHtmComponentClosingTags && this._attemptCharCode(47)) this._attemptCharCodeUntilFn(v), this._requireCharCode(62), this._endToken([]);
			else {
				let [t, r] = this._consumePrefixAndName(Ee);
				this._attemptCharCodeUntilFn(v), this._requireCharCode(62), this._endToken([t, r]), this._handleFullNameStackForTagClose(t, r);
			}
		}
		_consumeExpansionFormStart() {
			this._beginToken(l.EXPANSION_FORM_START), this._requireCharCode(123), this._endToken([]), this._expansionCaseStack.push(l.EXPANSION_FORM_START), this._beginToken(l.RAW_TEXT);
			let e = this._readUntil(44), t = this._processCarriageReturns(e);
			if (this._i18nNormalizeLineEndingsInICUs) this._endToken([t]);
			else {
				let n = this._endToken([e]);
				t !== e && this.nonNormalizedIcuExpressions.push(n);
			}
			this._requireCharCode(44), this._attemptCharCodeUntilFn(v), this._beginToken(l.RAW_TEXT);
			let r = this._readUntil(44);
			this._endToken([r]), this._requireCharCode(44), this._attemptCharCodeUntilFn(v);
		}
		_consumeExpansionCaseStart() {
			this._beginToken(l.EXPANSION_CASE_VALUE);
			let e = this._readUntil(123).trim();
			this._endToken([e]), this._attemptCharCodeUntilFn(v), this._beginToken(l.EXPANSION_CASE_EXP_START), this._requireCharCode(123), this._endToken([]), this._attemptCharCodeUntilFn(v), this._expansionCaseStack.push(l.EXPANSION_CASE_EXP_START);
		}
		_consumeExpansionCaseEnd() {
			this._beginToken(l.EXPANSION_CASE_EXP_END), this._requireCharCode(125), this._endToken([]), this._attemptCharCodeUntilFn(v), this._expansionCaseStack.pop();
		}
		_consumeExpansionFormEnd() {
			this._beginToken(l.EXPANSION_FORM_END), this._requireCharCode(125), this._endToken([]), this._expansionCaseStack.pop();
		}
		_consumeWithInterpolation(e, t, r, n) {
			this._beginToken(e);
			let i = [];
			for (; !r();) {
				let a = this._cursor.clone();
				this._attemptStr(st.start) ? (this._endToken([this._processCarriageReturns(i.join(""))], a), i.length = 0, this._consumeInterpolation(t, a, n), this._beginToken(e)) : this._cursor.peek() === 38 ? (this._endToken([this._processCarriageReturns(i.join(""))]), i.length = 0, this._consumeEntity(e), this._beginToken(e)) : i.push(this._readChar());
			}
			this._inInterpolation = !1;
			let s = this._processCarriageReturns(i.join(""));
			return this._endToken([s]), s;
		}
		_consumeInterpolation(e, t, r) {
			let n = [];
			this._beginToken(e, t), n.push(st.start);
			let i = this._cursor.clone(), s = null, a = !1;
			for (; this._cursor.peek() !== 0 && (r === null || !r());) {
				let o = this._cursor.clone();
				if (this._isTagStart()) {
					this._cursor = o, n.push(this._getProcessedChars(i, o)), this._endToken(n);
					return;
				}
				if (s === null) if (this._attemptStr(st.end)) {
					n.push(this._getProcessedChars(i, o)), n.push(st.end), this._endToken(n);
					return;
				} else this._attemptStr("//") && (a = !0);
				let c = this._cursor.peek();
				this._cursor.advance(), c === 92 ? this._cursor.advance() : c === s ? s = null : !a && s === null && Dt(c) && (s = c);
			}
			n.push(this._getProcessedChars(i, this._cursor)), this._endToken(n);
		}
		_consumeDirective(e, t) {
			for (this._requireCharCode(64), this._cursor.advance(); Ni(this._cursor.peek());) this._cursor.advance();
			this._beginToken(l.DIRECTIVE_NAME, e);
			let r = this._cursor.getChars(t);
			if (this._endToken([r]), this._attemptCharCodeUntilFn(v), this._cursor.peek() === 40) {
				for (this._openDirectiveCount++, this._beginToken(l.DIRECTIVE_OPEN), this._cursor.advance(), this._endToken([]), this._attemptCharCodeUntilFn(v); !Li(this._cursor.peek()) && this._cursor.peek() !== 41;) this._consumeAttribute();
				if (this._attemptCharCodeUntilFn(v), this._openDirectiveCount--, this._cursor.peek() !== 41) {
					if (this._cursor.peek() === 62 || this._cursor.peek() === 47) return;
					throw this._createError(Se(this._cursor.peek()), this._cursor.getSpan(e));
				}
				this._beginToken(l.DIRECTIVE_CLOSE), this._cursor.advance(), this._endToken([]), this._attemptCharCodeUntilFn(v);
			}
		}
		_getProcessedChars(e, t) {
			return this._processCarriageReturns(t.getChars(e));
		}
		_isTextEnd() {
			return !!(this._isTagStart() || this._cursor.peek() === 0 || this._tokenizeIcu && !this._inInterpolation && (this.isExpansionFormStart() || this._cursor.peek() === 125 && this._isInExpansionCase()) || this._tokenizeBlocks && !this._inInterpolation && !this._isInExpansion() && (this._isBlockStart() || this._isLetStart() || this._cursor.peek() === 125));
		}
		_isTagStart() {
			if (this._cursor.peek() === 60) {
				let e = this._cursor.clone();
				e.advance();
				let t = e.peek();
				if (97 <= t && t <= 122 || 65 <= t && t <= 90 || t === 47 || t === 33) return !0;
			}
			return !1;
		}
		_readUntil(e) {
			let t = this._cursor.clone();
			return this._attemptUntilChar(e), this._cursor.getChars(t);
		}
		_isInExpansion() {
			return this._isInExpansionCase() || this._isInExpansionForm();
		}
		_isInExpansionCase() {
			return this._expansionCaseStack.length > 0 && this._expansionCaseStack[this._expansionCaseStack.length - 1] === l.EXPANSION_CASE_EXP_START;
		}
		_isInExpansionForm() {
			return this._expansionCaseStack.length > 0 && this._expansionCaseStack[this._expansionCaseStack.length - 1] === l.EXPANSION_FORM_START;
		}
		isExpansionFormStart() {
			if (this._cursor.peek() !== 123) return !1;
			let e = this._cursor.clone(), t = this._attemptStr(st.start);
			return this._cursor = e, !t;
		}
		_handleFullNameStackForTagOpen(e, t) {
			let r = fe(e, t);
			(this._fullNameStack.length === 0 || this._fullNameStack[this._fullNameStack.length - 1] === r) && this._fullNameStack.push(r);
		}
		_handleFullNameStackForTagClose(e, t) {
			let r = fe(e, t);
			this._fullNameStack.length !== 0 && this._fullNameStack[this._fullNameStack.length - 1] === r && this._fullNameStack.pop();
		}
	};
	Oi = class _r {
		state;
		file;
		input;
		end;
		constructor(t, r) {
			if (t instanceof _r) {
				this.file = t.file, this.input = t.input, this.end = t.end;
				let n = t.state;
				this.state = {
					peek: n.peek,
					offset: n.offset,
					line: n.line,
					column: n.column
				};
			} else {
				if (!r) throw new Error("Programming error: the range argument must be provided with a file argument.");
				this.file = t, this.input = t.content, this.end = r.endPos, this.state = {
					peek: -1,
					offset: r.startPos,
					line: r.startLine,
					column: r.startCol
				};
			}
		}
		clone() {
			return new _r(this);
		}
		peek() {
			return this.state.peek;
		}
		charsLeft() {
			return this.end - this.state.offset;
		}
		diff(t) {
			return this.state.offset - t.state.offset;
		}
		advance() {
			this.advanceState(this.state);
		}
		init() {
			this.updatePeek(this.state);
		}
		getSpan(t, r) {
			t = t || this;
			let n = t;
			if (r) for (; this.diff(t) > 0 && r.indexOf(t.peek()) !== -1;) n === t && (t = t.clone()), t.advance();
			let i = this.locationFromCursor(t);
			return new h(i, this.locationFromCursor(this), n !== t ? this.locationFromCursor(n) : i);
		}
		getChars(t) {
			return this.input.substring(t.state.offset, this.state.offset);
		}
		charAt(t) {
			return this.input.charCodeAt(t);
		}
		advanceState(t) {
			if (t.offset >= this.end) throw this.state = t, new Er("Unexpected character \"EOF\"", this);
			let r = this.charAt(t.offset);
			r === 10 ? (t.line++, t.column = 0) : Me(r) || t.column++, t.offset++, this.updatePeek(t);
		}
		updatePeek(t) {
			t.peek = t.offset >= this.end ? 0 : this.charAt(t.offset);
		}
		locationFromCursor(t) {
			return new De(t.file, t.state.offset, t.state.line, t.state.column);
		}
	}, Ka = class Sr extends Oi {
		internalState;
		constructor(t, r) {
			t instanceof Sr ? (super(t), this.internalState = { ...t.internalState }) : (super(t, r), this.internalState = this.state);
		}
		advance() {
			this.state = this.internalState, super.advance(), this.processEscapeSequence();
		}
		init() {
			super.init(), this.processEscapeSequence();
		}
		clone() {
			return new Sr(this);
		}
		getChars(t) {
			let r = t.clone(), n = "";
			for (; r.internalState.offset < this.internalState.offset;) n += String.fromCodePoint(r.peek()), r.advance();
			return n;
		}
		processEscapeSequence() {
			let t = () => this.internalState.peek;
			if (t() === 92) if (this.internalState = { ...this.state }, this.advanceState(this.internalState), t() === 110) this.state.peek = 10;
			else if (t() === 114) this.state.peek = 13;
			else if (t() === 118) this.state.peek = 11;
			else if (t() === 116) this.state.peek = 9;
			else if (t() === 98) this.state.peek = 8;
			else if (t() === 102) this.state.peek = 12;
			else if (t() === 117) if (this.advanceState(this.internalState), t() === 123) {
				this.advanceState(this.internalState);
				let r = this.clone(), n = 0;
				for (; t() !== 125;) this.advanceState(this.internalState), n++;
				this.state.peek = this.decodeHexDigits(r, n);
			} else {
				let r = this.clone();
				this.advanceState(this.internalState), this.advanceState(this.internalState), this.advanceState(this.internalState), this.state.peek = this.decodeHexDigits(r, 4);
			}
			else if (t() === 120) {
				this.advanceState(this.internalState);
				let r = this.clone();
				this.advanceState(this.internalState), this.state.peek = this.decodeHexDigits(r, 2);
			} else if (dr(t())) {
				let r = "", n = 0, i = this.clone();
				for (; dr(t()) && n < 3;) i = this.clone(), r += String.fromCodePoint(t()), this.advanceState(this.internalState), n++;
				this.state.peek = parseInt(r, 8), this.internalState = i.internalState;
			} else Me(this.internalState.peek) ? (this.advanceState(this.internalState), this.state = this.internalState) : this.state.peek = this.internalState.peek;
		}
		decodeHexDigits(t, r) {
			let n = this.input.slice(t.internalState.offset, t.internalState.offset + r), i = parseInt(n, 16);
			if (isNaN(i)) throw t.state = t.internalState, new Er("Invalid hexadecimal escape sequence", t);
			return i;
		}
	}, Er = class extends Error {
		constructor(e, t) {
			super(e), this.msg = e, this.cursor = t, Object.setPrototypeOf(this, new.target.prototype);
		}
	};
	y = class Ri extends ee {
		static create(t, r, n) {
			return new Ri(t, r, n);
		}
		constructor(t, r, n) {
			super(r, n), this.elementName = t;
		}
	}, Qa = class {
		constructor(e, t) {
			this.rootNodes = e, this.errors = t;
		}
	}, Mi = class {
		constructor(e) {
			this.getTagDefinition = e;
		}
		parse(e, t, r, n = !1, i) {
			let s = (m) => (_, ...T) => m(_.toLowerCase(), ...T), a = n ? this.getTagDefinition : s(this.getTagDefinition), o = (m) => a(m).getContentType(), c = n ? i : s(i), u = Pi(e, t, i ? (m, _, T, P) => {
				let z = c(m, _, T, P);
				return z !== void 0 ? z : o(m);
			} : o, r), p = r && r.canSelfClose || !1, d = r && r.allowHtmComponentClosingTags || !1, g = new Ja(u.tokens, a, p, d, n);
			return g.build(), new Qa(g.rootNodes, [...u.errors, ...g.errors]);
		}
	}, Ja = class Bi {
		_index = -1;
		_peek;
		_containerStack = [];
		rootNodes = [];
		errors = [];
		constructor(t, r, n, i, s) {
			this.tokens = t, this.tagDefinitionResolver = r, this.canSelfClose = n, this.allowHtmComponentClosingTags = i, this.isTagNameCaseSensitive = s, this._advance();
		}
		build() {
			for (; this._peek.type !== l.EOF;) this._peek.type === l.TAG_OPEN_START || this._peek.type === l.INCOMPLETE_TAG_OPEN ? this._consumeElementStartTag(this._advance()) : this._peek.type === l.TAG_CLOSE ? (this._closeVoidElement(), this._consumeElementEndTag(this._advance())) : this._peek.type === l.CDATA_START ? (this._closeVoidElement(), this._consumeCdata(this._advance())) : this._peek.type === l.COMMENT_START ? (this._closeVoidElement(), this._consumeComment(this._advance())) : this._peek.type === l.TEXT || this._peek.type === l.RAW_TEXT || this._peek.type === l.ESCAPABLE_RAW_TEXT ? (this._closeVoidElement(), this._consumeText(this._advance())) : this._peek.type === l.EXPANSION_FORM_START ? this._consumeExpansion(this._advance()) : this._peek.type === l.BLOCK_OPEN_START ? (this._closeVoidElement(), this._consumeBlockOpen(this._advance())) : this._peek.type === l.BLOCK_CLOSE ? (this._closeVoidElement(), this._consumeBlockClose(this._advance())) : this._peek.type === l.INCOMPLETE_BLOCK_OPEN ? (this._closeVoidElement(), this._consumeIncompleteBlock(this._advance())) : this._peek.type === l.LET_START ? (this._closeVoidElement(), this._consumeLet(this._advance())) : this._peek.type === l.DOC_TYPE_START ? this._consumeDocType(this._advance()) : this._peek.type === l.INCOMPLETE_LET ? (this._closeVoidElement(), this._consumeIncompleteLet(this._advance())) : this._peek.type === l.COMPONENT_OPEN_START || this._peek.type === l.INCOMPLETE_COMPONENT_OPEN ? this._consumeComponentStartTag(this._advance()) : this._peek.type === l.COMPONENT_CLOSE ? this._consumeComponentEndTag(this._advance()) : this._advance();
			for (let t of this._containerStack) t instanceof ge && this.errors.push(y.create(t.name, t.sourceSpan, `Unclosed block "${t.name}"`));
		}
		_advance() {
			let t = this._peek;
			return this._index < this.tokens.length - 1 && this._index++, this._peek = this.tokens[this._index], t;
		}
		_advanceIf(t) {
			return this._peek.type === t ? this._advance() : null;
		}
		_consumeCdata(t) {
			let r = this._advance(), n = this._getText(r), i = this._advanceIf(l.CDATA_END);
			this._addToParent(new Si(n, new h(t.sourceSpan.start, (i || r).sourceSpan.end), [r]));
		}
		_consumeComment(t) {
			let r = this._advanceIf(l.RAW_TEXT), n = this._advanceIf(l.COMMENT_END), i = r != null ? r.parts[0].trim() : null, s = n == null ? t.sourceSpan : new h(t.sourceSpan.start, n.sourceSpan.end, t.sourceSpan.fullStart);
			this._addToParent(new Ti(i, s));
		}
		_consumeDocType(t) {
			let r = this._advanceIf(l.RAW_TEXT), n = this._advanceIf(l.DOC_TYPE_END), i = r != null ? r.parts[0].trim() : null, s = new h(t.sourceSpan.start, (n || r || t).sourceSpan.end);
			this._addToParent(new bi(i, s));
		}
		_consumeExpansion(t) {
			let r = this._advance(), n = this._advance(), i = [];
			for (; this._peek.type === l.EXPANSION_CASE_VALUE;) {
				let a = this._parseExpansionCase();
				if (!a) return;
				i.push(a);
			}
			if (this._peek.type !== l.EXPANSION_FORM_END) {
				this.errors.push(y.create(null, this._peek.sourceSpan, "Invalid ICU message. Missing '}'."));
				return;
			}
			let s = new h(t.sourceSpan.start, this._peek.sourceSpan.end, t.sourceSpan.fullStart);
			this._addToParent(new Ei(r.parts[0], n.parts[0], i, s, r.sourceSpan)), this._advance();
		}
		_parseExpansionCase() {
			let t = this._advance();
			if (this._peek.type !== l.EXPANSION_CASE_EXP_START) return this.errors.push(y.create(null, this._peek.sourceSpan, "Invalid ICU message. Missing '{'.")), null;
			let r = this._advance(), n = this._collectExpansionExpTokens(r);
			if (!n) return null;
			let i = this._advance();
			n.push({
				type: l.EOF,
				parts: [],
				sourceSpan: i.sourceSpan
			});
			let s = new Bi(n, this.tagDefinitionResolver, this.canSelfClose, this.allowHtmComponentClosingTags, this.isTagNameCaseSensitive);
			if (s.build(), s.errors.length > 0) return this.errors = this.errors.concat(s.errors), null;
			let a = new h(t.sourceSpan.start, i.sourceSpan.end, t.sourceSpan.fullStart), o = new h(r.sourceSpan.start, i.sourceSpan.end, r.sourceSpan.fullStart);
			return new Ci(t.parts[0], s.rootNodes, a, t.sourceSpan, o);
		}
		_collectExpansionExpTokens(t) {
			let r = [], n = [l.EXPANSION_CASE_EXP_START];
			for (;;) {
				if ((this._peek.type === l.EXPANSION_FORM_START || this._peek.type === l.EXPANSION_CASE_EXP_START) && n.push(this._peek.type), this._peek.type === l.EXPANSION_CASE_EXP_END) if (Di(n, l.EXPANSION_CASE_EXP_START)) {
					if (n.pop(), n.length === 0) return r;
				} else return this.errors.push(y.create(null, t.sourceSpan, "Invalid ICU message. Missing '}'.")), null;
				if (this._peek.type === l.EXPANSION_FORM_END) if (Di(n, l.EXPANSION_FORM_START)) n.pop();
				else return this.errors.push(y.create(null, t.sourceSpan, "Invalid ICU message. Missing '}'.")), null;
				if (this._peek.type === l.EOF) return this.errors.push(y.create(null, t.sourceSpan, "Invalid ICU message. Missing '}'.")), null;
				r.push(this._advance());
			}
		}
		_getText(t) {
			let r = t.parts[0];
			if (r.length > 0 && r[0] == `
`) {
				var n;
				let i = this._getClosestElementLikeParent();
				i != null && i.children.length == 0 && !((n = this._getTagDefinition(i)) === null || n === void 0) && n.ignoreFirstLf && (r = r.substring(1));
			}
			return r;
		}
		_consumeText(t) {
			let r = [t], n = t.sourceSpan, i = t.parts[0];
			if (i.length > 0 && i[0] === `
`) {
				var s;
				let a = this._getContainer();
				a != null && a.children.length === 0 && !((s = this._getTagDefinition(a)) === null || s === void 0) && s.ignoreFirstLf && (i = i.substring(1), r[0] = {
					type: t.type,
					sourceSpan: t.sourceSpan,
					parts: [i]
				});
			}
			for (; this._peek.type === l.INTERPOLATION || this._peek.type === l.TEXT || this._peek.type === l.ENCODED_ENTITY;) t = this._advance(), r.push(t), t.type === l.INTERPOLATION ? i += t.parts.join("").replace(/&([^;]+);/g, Ii) : t.type === l.ENCODED_ENTITY ? i += t.parts[0] : i += t.parts.join("");
			if (i.length > 0) {
				let a = t.sourceSpan;
				this._addToParent(new _i(i, new h(n.start, a.end, n.fullStart, n.details), r));
			}
		}
		_closeVoidElement() {
			var t;
			let r = this._getContainer();
			r !== null && !((t = this._getTagDefinition(r)) === null || t === void 0) && t.isVoid && this._containerStack.pop();
		}
		_consumeElementStartTag(t) {
			var r;
			let n = [], i = [];
			this._consumeAttributesAndDirectives(n, i);
			let s = this._getElementFullName(t, this._getClosestElementLikeParent()), a = this._getTagDefinition(s), o = !1;
			if (this._peek.type === l.TAG_OPEN_END_VOID) {
				this._advance(), o = !0;
				let T = this._getTagDefinition(s);
				this.canSelfClose || T?.canSelfClose || Pe(s) !== null || T?.isVoid || this.errors.push(y.create(s, t.sourceSpan, `Only void, custom and foreign elements can be self closed "${t.parts[1]}"`));
			} else this._peek.type === l.TAG_OPEN_END && (this._advance(), o = !1);
			let c = this._peek.sourceSpan.fullStart, u = new h(t.sourceSpan.start, c, t.sourceSpan.fullStart), p = new h(t.sourceSpan.start, c, t.sourceSpan.fullStart), d = new h(t.sourceSpan.start.moveBy(1), t.sourceSpan.end), g = new te(s, n, i, [], o, u, p, void 0, d, a?.isVoid ?? !1), m = this._getContainer(), _ = m !== null && !!(!((r = this._getTagDefinition(m)) === null || r === void 0) && r.isClosedByChild(g.name));
			this._pushContainer(g, _), o ? this._popContainer(s, te, u) : t.type === l.INCOMPLETE_TAG_OPEN && (this._popContainer(s, te, null), this.errors.push(y.create(s, u, `Opening tag "${s}" not terminated.`)));
		}
		_consumeComponentStartTag(t) {
			var r;
			let n = t.parts[0], i = [], s = [];
			this._consumeAttributesAndDirectives(i, s);
			let a = this._getClosestElementLikeParent(), o = this._getComponentTagName(t, a), c = this._getComponentFullName(t, a), u = this._peek.type === l.COMPONENT_OPEN_END_VOID;
			this._advance();
			let p = this._peek.sourceSpan.fullStart, d = new h(t.sourceSpan.start, p, t.sourceSpan.fullStart), g = new G(n, o, c, i, s, [], u, d, new h(t.sourceSpan.start, p, t.sourceSpan.fullStart), void 0), m = this._getContainer(), _ = m !== null && g.tagName !== null && !!(!((r = this._getTagDefinition(m)) === null || r === void 0) && r.isClosedByChild(g.tagName));
			this._pushContainer(g, _), u ? this._popContainer(c, G, d) : t.type === l.INCOMPLETE_COMPONENT_OPEN && (this._popContainer(c, G, null), this.errors.push(y.create(c, d, `Opening tag "${c}" not terminated.`)));
		}
		_consumeAttributesAndDirectives(t, r) {
			for (; this._peek.type === l.ATTR_NAME || this._peek.type === l.DIRECTIVE_NAME;) this._peek.type === l.DIRECTIVE_NAME ? r.push(this._consumeDirective(this._peek)) : t.push(this._consumeAttr(this._advance()));
		}
		_consumeComponentEndTag(t) {
			let r = this._getComponentFullName(t, this._getClosestElementLikeParent());
			if (!this._popContainer(r, G, t.sourceSpan)) {
				let n = this._containerStack[this._containerStack.length - 1], i;
				n instanceof G && n.componentName === t.parts[0] ? i = `, did you mean "${n.fullName}"?` : i = ". It may happen when the tag has already been closed by another tag.";
				let s = `Unexpected closing tag "${r}"${i}`;
				this.errors.push(y.create(r, t.sourceSpan, s));
			}
		}
		_getTagDefinition(t) {
			return typeof t == "string" ? this.tagDefinitionResolver(t) : t instanceof te ? this.tagDefinitionResolver(t.name) : t instanceof G && t.tagName !== null ? this.tagDefinitionResolver(t.tagName) : null;
		}
		_pushContainer(t, r) {
			r && this._containerStack.pop(), this._addToParent(t), this._containerStack.push(t);
		}
		_consumeElementEndTag(t) {
			var r;
			let n = this.allowHtmComponentClosingTags && t.parts.length === 0 ? null : this._getElementFullName(t, this._getClosestElementLikeParent());
			if (n && !((r = this._getTagDefinition(n)) === null || r === void 0) && r.isVoid) this.errors.push(y.create(n, t.sourceSpan, `Void elements do not have end tags "${t.parts[1]}"`));
			else if (!this._popContainer(n, te, t.sourceSpan)) {
				let i = `Unexpected closing tag "${n}". It may happen when the tag has already been closed by another tag. For more info see https://www.w3.org/TR/html5/syntax.html#closing-elements-that-have-implied-end-tags`;
				this.errors.push(y.create(n, t.sourceSpan, i));
			}
		}
		_popContainer(t, r, n) {
			let i = !1;
			for (let a = this._containerStack.length - 1; a >= 0; a--) {
				var s;
				let o = this._containerStack[a], c = o instanceof G ? o.fullName : o.name;
				if (Pe(c) ? c === t : (c === t || t === null) && o instanceof r) return o.endSourceSpan = n, o.sourceSpan.end = n !== null ? n.end : o.sourceSpan.end, this._containerStack.splice(a, this._containerStack.length - a), !i;
				(o instanceof ge || !(!((s = this._getTagDefinition(o)) === null || s === void 0) && s.closedByParent)) && (i = !0);
			}
			return !1;
		}
		_consumeAttr(t) {
			let r = fe(t.parts[0], t.parts[1]), n = t.sourceSpan.end, i;
			this._peek.type === l.ATTR_QUOTE && (i = this._advance());
			let s = "", a = [], o, c;
			if (this._peek.type === l.ATTR_VALUE_TEXT) for (o = this._peek.sourceSpan, c = this._peek.sourceSpan.end; this._peek.type === l.ATTR_VALUE_TEXT || this._peek.type === l.ATTR_VALUE_INTERPOLATION || this._peek.type === l.ENCODED_ENTITY;) {
				let p = this._advance();
				a.push(p), p.type === l.ATTR_VALUE_INTERPOLATION ? s += p.parts.join("").replace(/&([^;]+);/g, Ii) : p.type === l.ENCODED_ENTITY ? s += p.parts[0] : s += p.parts.join(""), c = n = p.sourceSpan.end;
			}
			this._peek.type === l.ATTR_QUOTE && (c = n = this._advance().sourceSpan.end);
			let u = o && c && new h(i?.sourceSpan.start ?? o.start, c, i?.sourceSpan.fullStart ?? o.fullStart);
			return new vi(r, s, new h(t.sourceSpan.start, n, t.sourceSpan.fullStart), t.sourceSpan, u, a.length > 0 ? a : void 0, void 0);
		}
		_consumeDirective(t) {
			let r = [], n = t.sourceSpan.end, i = null;
			if (this._advance(), this._peek.type === l.DIRECTIVE_OPEN) {
				for (n = this._peek.sourceSpan.end, this._advance(); this._peek.type === l.ATTR_NAME;) r.push(this._consumeAttr(this._advance()));
				this._peek.type === l.DIRECTIVE_CLOSE ? (i = this._peek.sourceSpan, this._advance()) : this.errors.push(y.create(null, t.sourceSpan, "Unterminated directive definition"));
			}
			let s = new h(t.sourceSpan.start, n, t.sourceSpan.fullStart), a = new h(s.start, i === null ? t.sourceSpan.end : i.end, s.fullStart);
			return new wi(t.parts[0], r, a, s, i);
		}
		_consumeBlockOpen(t) {
			let r = [];
			for (; this._peek.type === l.BLOCK_PARAMETER;) {
				let o = this._advance();
				r.push(new hr(o.parts[0], o.sourceSpan));
			}
			this._peek.type === l.BLOCK_OPEN_END && this._advance();
			let n = this._peek.sourceSpan.fullStart, i = new h(t.sourceSpan.start, n, t.sourceSpan.fullStart), s = new h(t.sourceSpan.start, n, t.sourceSpan.fullStart), a = new ge(t.parts[0], r, [], i, t.sourceSpan, s);
			this._pushContainer(a, !1);
		}
		_consumeBlockClose(t) {
			let r = this._containerStack.length, n = this._containerStack[r - 1];
			if (!this._popContainer(null, ge, t.sourceSpan)) {
				if (this._containerStack.length < r) {
					let i = n instanceof G ? n.fullName : n.name;
					this.errors.push(y.create(null, t.sourceSpan, `Unexpected closing block. The block may have been closed earlier. Did you forget to close the <${i}> element? If you meant to write the \`}\` character, you should use the "&#125;" HTML entity instead.`));
					return;
				}
				this.errors.push(y.create(null, t.sourceSpan, "Unexpected closing block. The block may have been closed earlier. If you meant to write the `}` character, you should use the \"&#125;\" HTML entity instead."));
			}
		}
		_consumeIncompleteBlock(t) {
			let r = [];
			for (; this._peek.type === l.BLOCK_PARAMETER;) {
				let o = this._advance();
				r.push(new hr(o.parts[0], o.sourceSpan));
			}
			let n = this._peek.sourceSpan.fullStart, i = new h(t.sourceSpan.start, n, t.sourceSpan.fullStart), s = new h(t.sourceSpan.start, n, t.sourceSpan.fullStart), a = new ge(t.parts[0], r, [], i, t.sourceSpan, s);
			this._pushContainer(a, !1), this._popContainer(null, ge, null), this.errors.push(y.create(t.parts[0], i, `Incomplete block "${t.parts[0]}". If you meant to write the @ character, you should use the "&#64;" HTML entity instead.`));
		}
		_consumeLet(t) {
			let r = t.parts[0], n, i;
			if (this._peek.type !== l.LET_VALUE) {
				this.errors.push(y.create(t.parts[0], t.sourceSpan, `Invalid @let declaration "${r}". Declaration must have a value.`));
				return;
			} else n = this._advance();
			if (this._peek.type !== l.LET_END) {
				this.errors.push(y.create(t.parts[0], t.sourceSpan, `Unterminated @let declaration "${r}". Declaration must be terminated with a semicolon.`));
				return;
			} else i = this._advance();
			let s = i.sourceSpan.fullStart, a = new h(t.sourceSpan.start, s, t.sourceSpan.fullStart), o = t.sourceSpan.toString().lastIndexOf(r), c = new h(t.sourceSpan.start.moveBy(o), t.sourceSpan.end), u = new mr(r, n.parts[0], a, c, n.sourceSpan);
			this._addToParent(u);
		}
		_consumeIncompleteLet(t) {
			let r = t.parts[0] ?? "", n = r ? ` "${r}"` : "";
			if (r.length > 0) {
				let i = t.sourceSpan.toString().lastIndexOf(r), s = new h(t.sourceSpan.start.moveBy(i), t.sourceSpan.end), a = new h(t.sourceSpan.start, t.sourceSpan.start.moveBy(0)), o = new mr(r, "", t.sourceSpan, s, a);
				this._addToParent(o);
			}
			this.errors.push(y.create(t.parts[0], t.sourceSpan, `Incomplete @let declaration${n}. @let declarations must be written as \`@let <name> = <value>;\``));
		}
		_getContainer() {
			return this._containerStack.length > 0 ? this._containerStack[this._containerStack.length - 1] : null;
		}
		_getClosestElementLikeParent() {
			for (let t = this._containerStack.length - 1; t > -1; t--) {
				let r = this._containerStack[t];
				if (r instanceof te || r instanceof G) return r;
			}
			return null;
		}
		_addToParent(t) {
			let r = this._getContainer();
			r === null ? this.rootNodes.push(t) : r.children.push(t);
		}
		_getElementFullName(t, r) {
			return fe(this._getPrefix(t, r), t.parts[1]);
		}
		_getComponentFullName(t, r) {
			let n = t.parts[0], i = this._getComponentTagName(t, r);
			return i === null ? n : i.startsWith(":") ? n + i : `${n}:${i}`;
		}
		_getComponentTagName(t, r) {
			let n = this._getPrefix(t, r), i = t.parts[2];
			return !n && !i ? null : !n && i ? i : fe(n, i || "ng-component");
		}
		_getPrefix(t, r) {
			var n;
			let i, s;
			if (t.type === l.COMPONENT_OPEN_START || t.type === l.INCOMPLETE_COMPONENT_OPEN || t.type === l.COMPONENT_CLOSE ? (i = t.parts[1], s = t.parts[2]) : (i = t.parts[0], s = t.parts[1]), i = i || ((n = this._getTagDefinition(s)) === null || n === void 0 ? void 0 : n.implicitNamespacePrefix) || "", !i && r) {
				let a = r instanceof te ? r.name : r.tagName;
				if (a !== null) {
					let o = et(a)[1], c = this._getTagDefinition(o);
					c !== null && !c.preventNamespaceInheritance && (i = Pe(a));
				}
			}
			return i;
		}
	};
	qi = class extends Mi {
		constructor() {
			super(Oe);
		}
		parse(e, t, r, n = !1, i) {
			return super.parse(e, t, r, n, i);
		}
	};
	Za = [
		to,
		ro,
		io,
		ao,
		oo,
		uo,
		lo,
		co,
		po,
		so
	];
	Fi = eo;
	Hi = {
		features: { experimental_frontMatterSupport: {
			massageAstNode: !0,
			embed: !0,
			print: !0
		} },
		preprocess: Fi,
		print: ho,
		insertPragma: ti,
		massageAstNode: $r,
		embed: $n,
		getVisitorKeys: Xn
	};
	Vi = [
		{
			name: "Angular",
			type: "markup",
			aceMode: "html",
			extensions: [".component.html"],
			tmScope: "text.html.basic",
			aliases: ["xhtml"],
			codemirrorMode: "htmlmixed",
			codemirrorMimeType: "text/html",
			parsers: ["angular"],
			vscodeLanguageIds: ["html"],
			filenames: [],
			linguistLanguageId: 146
		},
		{
			name: "HTML",
			type: "markup",
			aceMode: "html",
			extensions: [
				".html",
				".hta",
				".htm",
				".html.hl",
				".inc",
				".xht",
				".xhtml"
			],
			tmScope: "text.html.basic",
			aliases: ["xhtml"],
			codemirrorMode: "htmlmixed",
			codemirrorMimeType: "text/html",
			parsers: ["html"],
			vscodeLanguageIds: ["html"],
			linguistLanguageId: 146
		},
		{
			name: "Lightning Web Components",
			type: "markup",
			aceMode: "html",
			extensions: [],
			tmScope: "text.html.basic",
			aliases: ["xhtml"],
			codemirrorMode: "htmlmixed",
			codemirrorMimeType: "text/html",
			parsers: ["lwc"],
			vscodeLanguageIds: ["html"],
			filenames: [],
			linguistLanguageId: 146
		},
		{
			name: "MJML",
			type: "markup",
			aceMode: "html",
			extensions: [".mjml"],
			tmScope: "text.mjml.basic",
			aliases: ["MJML", "mjml"],
			codemirrorMode: "htmlmixed",
			codemirrorMimeType: "text/html",
			parsers: ["mjml"],
			filenames: [],
			vscodeLanguageIds: ["mjml"],
			linguistLanguageId: 146
		},
		{
			name: "Vue",
			type: "markup",
			aceMode: "vue",
			extensions: [".vue"],
			tmScope: "source.vue",
			codemirrorMode: "vue",
			codemirrorMimeType: "text/x-vue",
			parsers: ["vue"],
			vscodeLanguageIds: ["vue"],
			linguistLanguageId: 391
		}
	];
	vr = {
		bracketSpacing: {
			category: "Common",
			type: "boolean",
			default: !0,
			description: "Print spaces between brackets.",
			oppositeDescription: "Do not print spaces between brackets."
		},
		objectWrap: {
			category: "Common",
			type: "choice",
			default: "preserve",
			description: "How to wrap object literals.",
			choices: [{
				value: "preserve",
				description: "Keep as multi-line, if there is a newline between the opening brace and first property."
			}, {
				value: "collapse",
				description: "Fit to a single line when possible."
			}]
		},
		singleQuote: {
			category: "Common",
			type: "boolean",
			default: !1,
			description: "Use single quotes instead of double quotes."
		},
		proseWrap: {
			category: "Common",
			type: "choice",
			default: "preserve",
			description: "How to wrap prose.",
			choices: [
				{
					value: "always",
					description: "Wrap prose if it exceeds the print width."
				},
				{
					value: "never",
					description: "Do not wrap prose."
				},
				{
					value: "preserve",
					description: "Wrap prose as-is."
				}
			]
		},
		bracketSameLine: {
			category: "Common",
			type: "boolean",
			default: !1,
			description: "Put > of opening tags on the last line instead of on a new line."
		},
		singleAttributePerLine: {
			category: "Common",
			type: "boolean",
			default: !1,
			description: "Enforce single attribute per line in HTML, Vue and JSX."
		}
	};
	Ui = "HTML", Wi = {
		bracketSameLine: vr.bracketSameLine,
		htmlWhitespaceSensitivity: {
			category: Ui,
			type: "choice",
			default: "css",
			description: "How to handle whitespaces in HTML.",
			choices: [
				{
					value: "css",
					description: "Respect the default value of CSS display property."
				},
				{
					value: "strict",
					description: "Whitespaces are considered sensitive."
				},
				{
					value: "ignore",
					description: "Whitespaces are considered insensitive."
				}
			]
		},
		singleAttributePerLine: vr.singleAttributePerLine,
		vueIndentScriptAndStyle: {
			category: Ui,
			type: "boolean",
			default: !1,
			description: "Indent script and style tags in Vue files."
		}
	};
	Nr = {};
	Or(Nr, {
		angular: () => Ro,
		html: () => Oo,
		lwc: () => Bo,
		mjml: () => Io,
		vue: () => Mo
	});
	Gi = go;
	_o = {
		canSelfClose: !0,
		normalizeTagName: !1,
		normalizeAttributeName: !1,
		allowHtmComponentClosingTags: !1,
		isTagNameCaseSensitive: !1,
		shouldParseFrontMatter: !0
	};
	Bt = new Map([
		["*", new Set([
			"accesskey",
			"autocapitalize",
			"autocorrect",
			"autofocus",
			"class",
			"contenteditable",
			"dir",
			"draggable",
			"enterkeyhint",
			"exportparts",
			"hidden",
			"id",
			"inert",
			"inputmode",
			"is",
			"itemid",
			"itemprop",
			"itemref",
			"itemscope",
			"itemtype",
			"lang",
			"nonce",
			"part",
			"popover",
			"slot",
			"spellcheck",
			"style",
			"tabindex",
			"title",
			"translate",
			"writingsuggestions"
		])],
		["a", new Set([
			"charset",
			"coords",
			"download",
			"href",
			"hreflang",
			"name",
			"ping",
			"referrerpolicy",
			"rel",
			"rev",
			"shape",
			"target",
			"type"
		])],
		["applet", new Set([
			"align",
			"alt",
			"archive",
			"code",
			"codebase",
			"height",
			"hspace",
			"name",
			"object",
			"vspace",
			"width"
		])],
		["area", new Set([
			"alt",
			"coords",
			"download",
			"href",
			"hreflang",
			"nohref",
			"ping",
			"referrerpolicy",
			"rel",
			"shape",
			"target",
			"type"
		])],
		["audio", new Set([
			"autoplay",
			"controls",
			"crossorigin",
			"loop",
			"muted",
			"preload",
			"src"
		])],
		["base", new Set(["href", "target"])],
		["basefont", new Set([
			"color",
			"face",
			"size"
		])],
		["blockquote", new Set(["cite"])],
		["body", new Set([
			"alink",
			"background",
			"bgcolor",
			"link",
			"text",
			"vlink"
		])],
		["br", new Set(["clear"])],
		["button", new Set([
			"command",
			"commandfor",
			"disabled",
			"form",
			"formaction",
			"formenctype",
			"formmethod",
			"formnovalidate",
			"formtarget",
			"name",
			"popovertarget",
			"popovertargetaction",
			"type",
			"value"
		])],
		["canvas", new Set(["height", "width"])],
		["caption", new Set(["align"])],
		["col", new Set([
			"align",
			"char",
			"charoff",
			"span",
			"valign",
			"width"
		])],
		["colgroup", new Set([
			"align",
			"char",
			"charoff",
			"span",
			"valign",
			"width"
		])],
		["data", new Set(["value"])],
		["del", new Set(["cite", "datetime"])],
		["details", new Set(["name", "open"])],
		["dialog", new Set(["closedby", "open"])],
		["dir", new Set(["compact"])],
		["div", new Set(["align"])],
		["dl", new Set(["compact"])],
		["embed", new Set([
			"height",
			"src",
			"type",
			"width"
		])],
		["fieldset", new Set([
			"disabled",
			"form",
			"name"
		])],
		["font", new Set([
			"color",
			"face",
			"size"
		])],
		["form", new Set([
			"accept",
			"accept-charset",
			"action",
			"autocomplete",
			"enctype",
			"method",
			"name",
			"novalidate",
			"target"
		])],
		["frame", new Set([
			"frameborder",
			"longdesc",
			"marginheight",
			"marginwidth",
			"name",
			"noresize",
			"scrolling",
			"src"
		])],
		["frameset", new Set(["cols", "rows"])],
		["h1", new Set(["align"])],
		["h2", new Set(["align"])],
		["h3", new Set(["align"])],
		["h4", new Set(["align"])],
		["h5", new Set(["align"])],
		["h6", new Set(["align"])],
		["head", new Set(["profile"])],
		["hr", new Set([
			"align",
			"noshade",
			"size",
			"width"
		])],
		["html", new Set(["manifest", "version"])],
		["iframe", new Set([
			"align",
			"allow",
			"allowfullscreen",
			"allowpaymentrequest",
			"allowusermedia",
			"frameborder",
			"height",
			"loading",
			"longdesc",
			"marginheight",
			"marginwidth",
			"name",
			"referrerpolicy",
			"sandbox",
			"scrolling",
			"src",
			"srcdoc",
			"width"
		])],
		["img", new Set([
			"align",
			"alt",
			"border",
			"crossorigin",
			"decoding",
			"fetchpriority",
			"height",
			"hspace",
			"ismap",
			"loading",
			"longdesc",
			"name",
			"referrerpolicy",
			"sizes",
			"src",
			"srcset",
			"usemap",
			"vspace",
			"width"
		])],
		["input", new Set([
			"accept",
			"align",
			"alpha",
			"alt",
			"autocomplete",
			"checked",
			"colorspace",
			"dirname",
			"disabled",
			"form",
			"formaction",
			"formenctype",
			"formmethod",
			"formnovalidate",
			"formtarget",
			"height",
			"ismap",
			"list",
			"max",
			"maxlength",
			"min",
			"minlength",
			"multiple",
			"name",
			"pattern",
			"placeholder",
			"popovertarget",
			"popovertargetaction",
			"readonly",
			"required",
			"size",
			"src",
			"step",
			"type",
			"usemap",
			"value",
			"width"
		])],
		["ins", new Set(["cite", "datetime"])],
		["isindex", new Set(["prompt"])],
		["label", new Set(["for", "form"])],
		["legend", new Set(["align"])],
		["li", new Set(["type", "value"])],
		["link", new Set([
			"as",
			"blocking",
			"charset",
			"color",
			"crossorigin",
			"disabled",
			"fetchpriority",
			"href",
			"hreflang",
			"imagesizes",
			"imagesrcset",
			"integrity",
			"media",
			"referrerpolicy",
			"rel",
			"rev",
			"sizes",
			"target",
			"type"
		])],
		["map", new Set(["name"])],
		["menu", new Set(["compact"])],
		["meta", new Set([
			"charset",
			"content",
			"http-equiv",
			"media",
			"name",
			"scheme"
		])],
		["meter", new Set([
			"high",
			"low",
			"max",
			"min",
			"optimum",
			"value"
		])],
		["object", new Set([
			"align",
			"archive",
			"border",
			"classid",
			"codebase",
			"codetype",
			"data",
			"declare",
			"form",
			"height",
			"hspace",
			"name",
			"standby",
			"type",
			"typemustmatch",
			"usemap",
			"vspace",
			"width"
		])],
		["ol", new Set([
			"compact",
			"reversed",
			"start",
			"type"
		])],
		["optgroup", new Set(["disabled", "label"])],
		["option", new Set([
			"disabled",
			"label",
			"selected",
			"value"
		])],
		["output", new Set([
			"for",
			"form",
			"name"
		])],
		["p", new Set(["align"])],
		["param", new Set([
			"name",
			"type",
			"value",
			"valuetype"
		])],
		["pre", new Set(["width"])],
		["progress", new Set(["max", "value"])],
		["q", new Set(["cite"])],
		["script", new Set([
			"async",
			"blocking",
			"charset",
			"crossorigin",
			"defer",
			"fetchpriority",
			"integrity",
			"language",
			"nomodule",
			"referrerpolicy",
			"src",
			"type"
		])],
		["select", new Set([
			"autocomplete",
			"disabled",
			"form",
			"multiple",
			"name",
			"required",
			"size"
		])],
		["slot", new Set(["name"])],
		["source", new Set([
			"height",
			"media",
			"sizes",
			"src",
			"srcset",
			"type",
			"width"
		])],
		["style", new Set([
			"blocking",
			"media",
			"type"
		])],
		["table", new Set([
			"align",
			"bgcolor",
			"border",
			"cellpadding",
			"cellspacing",
			"frame",
			"rules",
			"summary",
			"width"
		])],
		["tbody", new Set([
			"align",
			"char",
			"charoff",
			"valign"
		])],
		["td", new Set([
			"abbr",
			"align",
			"axis",
			"bgcolor",
			"char",
			"charoff",
			"colspan",
			"headers",
			"height",
			"nowrap",
			"rowspan",
			"scope",
			"valign",
			"width"
		])],
		["template", new Set([
			"shadowrootclonable",
			"shadowrootcustomelementregistry",
			"shadowrootdelegatesfocus",
			"shadowrootmode",
			"shadowrootserializable"
		])],
		["textarea", new Set([
			"autocomplete",
			"cols",
			"dirname",
			"disabled",
			"form",
			"maxlength",
			"minlength",
			"name",
			"placeholder",
			"readonly",
			"required",
			"rows",
			"wrap"
		])],
		["tfoot", new Set([
			"align",
			"char",
			"charoff",
			"valign"
		])],
		["th", new Set([
			"abbr",
			"align",
			"axis",
			"bgcolor",
			"char",
			"charoff",
			"colspan",
			"headers",
			"height",
			"nowrap",
			"rowspan",
			"scope",
			"valign",
			"width"
		])],
		["thead", new Set([
			"align",
			"char",
			"charoff",
			"valign"
		])],
		["time", new Set(["datetime"])],
		["tr", new Set([
			"align",
			"bgcolor",
			"char",
			"charoff",
			"valign"
		])],
		["track", new Set([
			"default",
			"kind",
			"label",
			"src",
			"srclang"
		])],
		["ul", new Set(["compact", "type"])],
		["video", new Set([
			"autoplay",
			"controls",
			"crossorigin",
			"height",
			"loop",
			"muted",
			"playsinline",
			"poster",
			"preload",
			"src",
			"width"
		])]
	]);
	zi = new Set([
		"a",
		"abbr",
		"acronym",
		"address",
		"applet",
		"area",
		"article",
		"aside",
		"audio",
		"b",
		"base",
		"basefont",
		"bdi",
		"bdo",
		"bgsound",
		"big",
		"blink",
		"blockquote",
		"body",
		"br",
		"button",
		"canvas",
		"caption",
		"center",
		"cite",
		"code",
		"col",
		"colgroup",
		"command",
		"content",
		"data",
		"datalist",
		"dd",
		"del",
		"details",
		"dfn",
		"dialog",
		"dir",
		"div",
		"dl",
		"dt",
		"em",
		"embed",
		"fencedframe",
		"fieldset",
		"figcaption",
		"figure",
		"font",
		"footer",
		"form",
		"frame",
		"frameset",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"head",
		"header",
		"hgroup",
		"hr",
		"html",
		"i",
		"iframe",
		"image",
		"img",
		"input",
		"ins",
		"isindex",
		"kbd",
		"keygen",
		"label",
		"legend",
		"li",
		"link",
		"listing",
		"main",
		"map",
		"mark",
		"marquee",
		"math",
		"menu",
		"menuitem",
		"meta",
		"meter",
		"multicol",
		"nav",
		"nextid",
		"nobr",
		"noembed",
		"noframes",
		"noscript",
		"object",
		"ol",
		"optgroup",
		"option",
		"output",
		"p",
		"param",
		"picture",
		"plaintext",
		"pre",
		"progress",
		"q",
		"rb",
		"rbc",
		"rp",
		"rt",
		"rtc",
		"ruby",
		"s",
		"samp",
		"script",
		"search",
		"section",
		"select",
		"selectedcontent",
		"shadow",
		"slot",
		"small",
		"source",
		"spacer",
		"span",
		"strike",
		"strong",
		"style",
		"sub",
		"summary",
		"sup",
		"svg",
		"table",
		"tbody",
		"td",
		"template",
		"textarea",
		"tfoot",
		"th",
		"thead",
		"time",
		"title",
		"tr",
		"track",
		"tt",
		"u",
		"ul",
		"var",
		"video",
		"wbr",
		"xmp"
	]);
	qt = {
		attrs: !0,
		children: !0,
		cases: !0,
		expression: !0
	}, $i = new Set(["parent"]), Be = class Be {
		constructor(t = {}) {
			Dr(this, re);
			Ut(this, "kind");
			Ut(this, "parent");
			for (let r of new Set([...$i, ...Object.keys(t)])) this.setProperty(r, t[r]);
			if (ie(t)) for (let r of Object.getOwnPropertySymbols(t)) this.setProperty(r, t[r]);
		}
		setProperty(t, r) {
			if (this[t] !== r) {
				if (t in qt && (r = r.map((n) => this.createChild(n))), !$i.has(t)) {
					this[t] = r;
					return;
				}
				Object.defineProperty(this, t, {
					value: r,
					enumerable: !1,
					configurable: !0
				});
			}
		}
		map(t) {
			let r;
			for (let n in qt) {
				let i = this[n];
				if (i) {
					let s = So(i, (a) => a.map(t));
					r !== i && (r || (r = new Be({ parent: this.parent })), r.setProperty(n, s));
				}
			}
			if (r) for (let n in this) n in qt || (r[n] = this[n]);
			return t(r || this);
		}
		walk(t) {
			for (let r in qt) {
				let n = this[r];
				if (n) for (let i = 0; i < n.length; i++) n[i].walk(t);
			}
			t(this);
		}
		createChild(t) {
			let r = t instanceof Be ? t.clone() : new Be(t);
			return r.setProperty("parent", this), r;
		}
		insertChildBefore(t, r) {
			let n = this.$children;
			n.splice(n.indexOf(t), 0, this.createChild(r));
		}
		removeChild(t) {
			let r = this.$children;
			r.splice(r.indexOf(t), 1);
		}
		replaceChild(t, r) {
			let n = this.$children;
			n[n.indexOf(t)] = this.createChild(r);
		}
		clone() {
			return new Be(this);
		}
		get $children() {
			return this[Fe(this, re, br)];
		}
		set $children(t) {
			this[Fe(this, re, br)] = t;
		}
		get firstChild() {
			return this.$children?.[0];
		}
		get lastChild() {
			return M(1, this.$children, -1);
		}
		get prev() {
			let t = Fe(this, re, wr);
			return t[t.indexOf(this) - 1];
		}
		get next() {
			let t = Fe(this, re, wr);
			return t[t.indexOf(this) + 1];
		}
		get rawName() {
			return this.hasExplicitNamespace ? this.fullName : this.name;
		}
		get fullName() {
			return this.namespace ? this.namespace + ":" + this.name : this.name;
		}
		get attrMap() {
			return Object.fromEntries(this.attrs.map((t) => [t.fullName, t.value]));
		}
	};
	re = /* @__PURE__ */ new WeakSet(), br = function() {
		return this.kind === "angularIcuCase" ? "expression" : this.kind === "angularIcuExpression" ? "cases" : "children";
	}, wr = function() {
		return this.parent?.$children ?? [];
	};
	Ft = Be;
	Eo = [
		{
			regex: /^(?<openingTagSuffix>\[if(?<condition>[^\]]*)\]>)(?<data>.*?)<!\s*\[endif\]$/su,
			parse: Co
		},
		{
			regex: /^\[if(?<condition>[^\]]*)\]><!$/u,
			parse: vo
		},
		{
			regex: /^<!\s*\[endif\]$/u,
			parse: To
		}
	];
	kr = class extends fr {
		visitExpansionCase(t, r) {
			r.parseOptions.name === "angular" && this.visitChildren(r, (n) => {
				n(t.expression);
			});
		}
		visit(t, { parseOptions: r }) {
			xo(t), yo(t, r), No(t, r), Ao(t);
		}
	};
	Ht = Mt({
		name: "html",
		normalizeTagName: !0,
		normalizeAttributeName: !0,
		allowHtmComponentClosingTags: !0
	});
	Oo = at(Ht), Do = new Set(["mj-style", "mj-raw"]), Io = at({
		...Ht,
		name: "mjml",
		shouldParseAsRawText: (e) => Do.has(e)
	}), Ro = at({
		name: "angular",
		tokenizeAngularBlocks: !0,
		tokenizeAngularLetDeclaration: !0
	}), Mo = at({
		name: "vue",
		isTagNameCaseSensitive: !0,
		shouldParseAsRawText(e, t, r, n) {
			return e.toLowerCase() !== "html" && !r && (e !== "template" || n.some(({ name: i, value: s }) => i === "lang" && s !== "html" && s !== "" && s !== void 0));
		}
	}), Bo = at({
		name: "lwc",
		canSelfClose: !1
	});
	qo = { html: Hi };
}))();
export { Ji as default, Vi as languages, Wi as options, Nr as parsers, qo as printers };
