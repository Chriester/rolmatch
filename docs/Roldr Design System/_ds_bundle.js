/* @ds-bundle: {"format":4,"namespace":"RoldrDesignSystem_220ac8","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"MatchBanner","sourcePath":"components/matchmaking/MatchBanner.jsx"},{"name":"SwipeActions","sourcePath":"components/matchmaking/SwipeActions.jsx"},{"name":"SwipeCard","sourcePath":"components/matchmaking/SwipeCard.jsx"},{"name":"BottomNav","sourcePath":"components/navigation/BottomNav.jsx"},{"name":"TopBar","sourcePath":"components/navigation/TopBar.jsx"},{"name":"Sheet","sourcePath":"components/overlays/Sheet.jsx"},{"name":"Avatar","sourcePath":"components/profile/Avatar.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"67ef2aa7b62b","components/core/Button.jsx":"fa5bd3ab16e3","components/core/Card.jsx":"076d1380ddc6","components/core/Chip.jsx":"5686bdb53902","components/core/Icon.jsx":"fcbb3dad367f","components/forms/Input.jsx":"1b7c84a78584","components/matchmaking/MatchBanner.jsx":"6069e1c200be","components/matchmaking/SwipeActions.jsx":"bd6946d8c9a5","components/matchmaking/SwipeCard.jsx":"8001fcda5909","components/navigation/BottomNav.jsx":"77d5f5cea43f","components/navigation/TopBar.jsx":"214e1284ff57","components/overlays/Sheet.jsx":"2b023eeb7fde","components/profile/Avatar.jsx":"d2080765bac0","ui_kits/roldr-app/App.jsx":"01046965a306","ui_kits/roldr-app/Screens.jsx":"b307b883cb9c","ui_kits/roldr-app/data.js":"cb78857f1c09"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.RoldrDesignSystem_220ac8 = window.RoldrDesignSystem_220ac8 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  live: {
    background: 'var(--live)',
    color: 'var(--pure-white)'
  },
  neutral: {
    background: 'var(--surface-raised)',
    color: 'var(--text-muted)'
  },
  success: {
    background: 'rgba(63,191,143,.16)',
    color: 'var(--success)'
  },
  warning: {
    background: 'rgba(232,164,76,.16)',
    color: 'var(--warning)'
  },
  danger: {
    background: 'rgba(229,72,77,.16)',
    color: 'var(--danger)'
  }
};

/** Small status pill. "live" is reserved for games running right now. */
function Badge({
  children,
  tone = 'neutral',
  dot,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 'var(--radius-pill)',
      font: 'var(--text-overline)',
      letterSpacing: 'var(--ls-overline)',
      textTransform: 'uppercase',
      ...tones[tone],
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'currentColor'
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Surface container: neutral.800, 1px neutral.600 border, radius 16. */
function Card({
  children,
  raised,
  padding = 'var(--card-padding)',
  ambient,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: raised ? 'var(--surface-raised)' : 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding,
      boxShadow: raised ? 'var(--shadow-card)' : 'var(--inset-hairline)',
      backgroundImage: ambient ? 'var(--ambient-carmine)' : undefined,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CDN = 'https://unpkg.com/lucide-static@0.428.0/icons';

/** Lucide (CDN) glyph tinted with currentColor via CSS mask. */
function Icon({
  name,
  size = 20,
  style,
  title,
  ...rest
}) {
  const url = `${CDN}/${name}.svg`;
  return /*#__PURE__*/React.createElement("span", _extends({
    role: title ? 'img' : undefined,
    "aria-label": title,
    "aria-hidden": title ? undefined : 'true',
    style: {
      display: 'inline-block',
      flex: '0 0 auto',
      width: size,
      height: size,
      background: 'currentColor',
      WebkitMaskImage: `url(${url})`,
      maskImage: `url(${url})`,
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const base = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  border: 0,
  cursor: 'pointer',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--btn-padding-y) var(--btn-padding-x)',
  font: 'var(--fw-semibold) var(--fs-body)/1 var(--font-body)',
  minHeight: 'var(--tap-min)',
  transition: 'transform var(--dur-fast) var(--ease-standard), filter var(--dur-fast) var(--ease-standard), background var(--dur-fast) var(--ease-standard)'
};
const variants = {
  primary: {
    background: 'var(--gradient-brand)',
    color: 'var(--text-on-brand)',
    fontWeight: 'var(--fw-bold)',
    boxShadow: 'var(--glow-brand)'
  },
  secondary: {
    background: 'var(--surface-raised)',
    color: 'var(--text)',
    boxShadow: 'var(--inset-hairline)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text)'
  },
  danger: {
    background: 'transparent',
    color: 'var(--danger)',
    boxShadow: 'inset 0 0 0 1px rgba(229,72,77,.4)'
  }
};
const sizes = {
  sm: {
    padding: '8px 14px',
    fontSize: 'var(--fs-caption)',
    minHeight: 36
  },
  md: {},
  lg: {
    padding: '15px 22px',
    fontSize: 'var(--fs-body-lg)'
  }
};

/** Roldr button. One gradient (primary) CTA per screen — never two. */
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth,
  disabled,
  children,
  style,
  ...rest
}) {
  const [pressed, setPressed] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => {
      setPressed(false);
      setHover(false);
    },
    onPointerEnter: () => setHover(true),
    style: {
      ...base,
      ...variants[variant],
      ...sizes[size],
      width: fullWidth ? '100%' : undefined,
      opacity: disabled ? 0.4 : 1,
      pointerEvents: disabled ? 'none' : undefined,
      filter: hover && !pressed ? 'brightness(1.08)' : undefined,
      background: hover && variant === 'ghost' ? 'var(--alpha-white-08)' : variants[variant].background,
      transform: pressed ? 'scale(var(--press-scale))' : 'none',
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === 'sm' ? 14 : 18
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: size === 'sm' ? 14 : 18
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  default: {
    bg: 'var(--chip-bg)',
    bgOn: 'var(--chip-bg-active)',
    border: 'var(--chip-border)',
    borderOn: 'var(--chip-border-active)',
    fg: 'var(--text)'
  },
  live: {
    bg: 'var(--alpha-carmine-12)',
    bgOn: 'var(--alpha-carmine-20)',
    border: 'var(--alpha-carmine-40)',
    borderOn: 'var(--brand-carmine)',
    fg: '#FFB4CE'
  },
  success: {
    bg: 'rgba(63,191,143,.12)',
    bgOn: 'rgba(63,191,143,.28)',
    border: 'rgba(63,191,143,.4)',
    borderOn: 'rgba(63,191,143,.6)',
    fg: 'var(--success)'
  }
};

/** Filter / attribute chip. Alpha fill 12–28%, border 40–60%. */
function Chip({
  label,
  children,
  selected,
  tone = 'default',
  icon,
  onClick,
  style,
  ...rest
}) {
  const t = tones[tone] || tones.default;
  const interactive = typeof onClick === 'function';
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    "aria-pressed": interactive ? !!selected : undefined,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--chip-padding-y) var(--chip-padding-x)',
      borderRadius: 'var(--radius-pill)',
      background: selected ? t.bgOn : t.bg,
      border: `1px solid ${selected ? t.borderOn : t.border}`,
      color: t.fg,
      font: 'var(--text-caption)',
      cursor: interactive ? 'pointer' : 'default',
      transition: 'background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13
  }), label || children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text field on surface-raised with a lilac focus ring. */
function Input({
  label,
  hint,
  icon,
  error,
  style,
  id,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fieldId = id || React.useId();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      font: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      background: 'var(--surface-raised)',
      border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '0 14px',
      minHeight: 'var(--tap-min)',
      boxShadow: focus ? `0 0 0 var(--focus-ring-width) var(--focus-ring)` : 'none',
      transition: 'box-shadow var(--dur-fast) var(--ease-standard)',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16
  })), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      background: 'transparent',
      border: 0,
      outline: 'none',
      color: 'var(--text)',
      font: 'var(--text-body)',
      padding: '12px 0'
    }
  }, rest))), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-caption)',
      color: error ? 'var(--danger)' : 'var(--text-muted)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/matchmaking/MatchBanner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Full-bleed "¡Mesa encontrada!" celebration overlay. */
function MatchBanner({
  title,
  gm,
  onOpen,
  onKeep,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      background: 'var(--scrim)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-4)',
      padding: 'var(--space-8)',
      textAlign: 'center',
      backgroundImage: 'var(--ambient-carmine)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 84,
      height: 84,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--gradient-brand)',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--pure-white)',
      boxShadow: 'var(--glow-brand)',
      animation: 'roldr-pop var(--dur-slow) var(--ease-dice)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "dices",
    size: 40
  })), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--text-display-2)',
      letterSpacing: 'var(--ls-display)'
    }
  }, "\xA1Mesa encontrada!"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--text-body)',
      color: 'var(--text-muted)',
      maxWidth: 260
    }
  }, gm, " te ha guardado sitio en ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text)'
    }
  }, title), "."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      width: '100%',
      maxWidth: 260
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onOpen,
    style: {
      background: 'var(--gradient-brand)',
      color: 'var(--pure-white)',
      border: 0,
      borderRadius: 'var(--radius-md)',
      padding: 'var(--btn-padding-y) var(--btn-padding-x)',
      font: 'var(--fw-bold) var(--fs-body)/1 var(--font-body)',
      cursor: 'pointer',
      minHeight: 'var(--tap-min)'
    }
  }, "Abrir la mesa"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onKeep,
    style: {
      background: 'transparent',
      color: 'var(--text-muted)',
      border: 0,
      font: 'var(--text-caption)',
      cursor: 'pointer',
      minHeight: 'var(--tap-min)'
    }
  }, "Seguir buscando")), /*#__PURE__*/React.createElement("style", null, '@keyframes roldr-pop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}'));
}
Object.assign(__ds_scope, { MatchBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/matchmaking/MatchBanner.jsx", error: String((e && e.message) || e) }); }

// components/matchmaking/SwipeActions.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const circle = (size, bg, fg, shadow) => ({
  width: size,
  height: size,
  borderRadius: 'var(--radius-pill)',
  display: 'grid',
  placeItems: 'center',
  border: 0,
  cursor: 'pointer',
  background: bg,
  color: fg,
  boxShadow: shadow,
  transition: 'transform var(--dur-fast) var(--ease-dice), filter var(--dur-fast) var(--ease-standard)'
});

/** Pass / superlike / join row under the swipe deck. */
function SwipeActions({
  onNo,
  onSuper,
  onYes,
  style,
  ...rest
}) {
  const [down, setDown] = React.useState(null);
  const press = k => ({
    onPointerDown: () => setDown(k),
    onPointerUp: () => setDown(null),
    onPointerLeave: () => setDown(null),
    style: {
      transform: down === k ? 'scale(.92)' : 'none'
    }
  });
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-5)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": "Pasar",
    onClick: onNo
  }, press('no'), {
    style: {
      ...circle(56, 'var(--surface-raised)', 'var(--danger)', 'var(--shadow-sm)'),
      ...press('no').style
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 24
  })), /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": "Guardar para luego",
    onClick: onSuper
  }, press('super'), {
    style: {
      ...circle(48, 'var(--alpha-lilac-12)', 'var(--brand-lilac)', 'var(--glow-accent)'),
      ...press('super').style
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bookmark",
    size: 20
  })), /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": "Unirme",
    onClick: onYes
  }, press('yes'), {
    style: {
      ...circle(64, 'var(--gradient-brand)', 'var(--pure-white)', 'var(--glow-brand)'),
      ...press('yes').style
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "dices",
    size: 28
  })));
}
Object.assign(__ds_scope, { SwipeActions });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/matchmaking/SwipeActions.jsx", error: String((e && e.message) || e) }); }

// components/navigation/BottomNav.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Fixed 5-slot app tab bar with glass blur over the dark background. */
function BottomNav({
  items = [],
  active = 0,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: 'grid',
      gridAutoFlow: 'column',
      gridAutoColumns: '1fr',
      alignItems: 'center',
      height: 'var(--bottom-nav-height)',
      background: 'rgba(19,17,25,.86)',
      backdropFilter: 'blur(var(--blur-glass))',
      borderTop: '1px solid var(--border)',
      ...style
    }
  }, rest), items.map((it, i) => {
    const on = i === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.label,
      type: "button",
      onClick: () => onChange && onChange(i),
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        padding: 6,
        color: on ? 'var(--brand-lilac)' : 'var(--text-muted)',
        font: 'var(--text-overline)',
        letterSpacing: '.02em',
        transition: 'color var(--dur-fast) var(--ease-standard)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 22
    }), it.label);
  }));
}
Object.assign(__ds_scope, { BottomNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/BottomNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Screen header. Shows the d20 mark on root screens, a back arrow deeper in. */
function TopBar({
  title,
  logoSrc,
  onBack,
  action,
  actionIcon,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: '10px var(--screen-gutter)',
      minHeight: 56,
      background: 'rgba(10,9,12,.72)',
      backdropFilter: 'blur(var(--blur-glass))',
      ...style
    }
  }, rest), onBack ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onBack,
    "aria-label": "Volver",
    style: {
      background: 'transparent',
      border: 0,
      color: 'var(--text)',
      cursor: 'pointer',
      display: 'flex',
      padding: 4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-left",
    size: 24
  })) : logoSrc ? /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "Roldr",
    style: {
      height: 28,
      width: 28
    }
  }) : null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--text-title-2)',
      flex: 1
    }
  }, title), actionIcon && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: action,
    style: {
      background: 'transparent',
      border: 0,
      color: 'var(--text-muted)',
      cursor: 'pointer',
      display: 'flex',
      padding: 4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: actionIcon,
    size: 22
  })));
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopBar.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Sheet.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Bottom sheet: scrim + surface panel, radius 24 on the top corners only. */
function Sheet({
  open,
  title,
  onClose,
  children,
  style,
  ...rest
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--scrim)',
      backdropFilter: 'blur(2px)'
    }
  }), /*#__PURE__*/React.createElement("section", _extends({
    style: {
      position: 'relative',
      width: '100%',
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
      padding: 'var(--sheet-padding)',
      boxShadow: 'var(--shadow-sheet)',
      animation: `roldr-sheet-in var(--dur-base) var(--ease-out)`,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: 36,
      height: 4,
      borderRadius: 999,
      background: 'var(--border-strong)',
      margin: '0 auto var(--space-4)'
    }
  }), title && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      marginBottom: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--text-title-1)',
      flex: 1
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Cerrar",
    style: {
      background: 'var(--surface-raised)',
      border: 0,
      borderRadius: 'var(--radius-pill)',
      width: 32,
      height: 32,
      display: 'grid',
      placeItems: 'center',
      color: 'var(--text-muted)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 16
  }))), children, /*#__PURE__*/React.createElement("style", null, '@keyframes roldr-sheet-in{from{transform:translateY(14px);opacity:.6}to{transform:none;opacity:1}}')));
}
Object.assign(__ds_scope, { Sheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Sheet.jsx", error: String((e && e.message) || e) }); }

// components/profile/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Circular player avatar; optional brand ring and live dot. */
function Avatar({
  src,
  name = '',
  size = 44,
  ring,
  live,
  style,
  ...rest
}) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: 'relative',
      display: 'inline-flex',
      flex: '0 0 auto',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: 'var(--radius-pill)',
      display: 'grid',
      placeItems: 'center',
      overflow: 'hidden',
      background: src ? 'var(--surface-raised)' : 'var(--gradient-brand)',
      color: 'var(--pure-white)',
      font: `var(--fw-bold) ${Math.round(size * 0.36)}px var(--font-display)`,
      padding: ring ? 2 : 0,
      boxShadow: ring ? '0 0 0 2px var(--brand-lilac)' : 'var(--inset-hairline)'
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      borderRadius: 'inherit'
    }
  }) : initials), live && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: -1,
      bottom: -1,
      width: size * 0.26,
      height: size * 0.26,
      borderRadius: '50%',
      background: 'var(--live)',
      border: '2px solid var(--bg)'
    }
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/profile/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/matchmaking/SwipeCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** The table card in the swipe deck: full-bleed art, bottom protection gradient, meta. */
function SwipeCard({
  title,
  system,
  gm,
  gmPhoto,
  imageUrl,
  tags = [],
  distance,
  seats,
  live,
  offset = 0,
  decision,
  style,
  ...rest
}) {
  const tint = decision === 'yes' ? 'var(--swipe-yes)' : decision === 'no' ? 'var(--swipe-no)' : null;
  return /*#__PURE__*/React.createElement("article", _extends({
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-swipe)',
      transform: `translateY(${offset * 10}px) scale(${1 - offset * 0.04})`,
      transition: 'transform var(--dur-card) var(--ease-out), opacity var(--dur-card) var(--ease-out)',
      ...style
    }
  }, rest), imageUrl ? /*#__PURE__*/React.createElement("img", {
    src: imageUrl,
    alt: "",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      filter: 'saturate(.9) contrast(1.05)'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--gradient-brand)',
      opacity: .55
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--scrim-bottom)'
    }
  }), tint && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: tint,
      opacity: .18
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 14,
      left: 14,
      right: 14,
      display: 'flex',
      gap: 8
    }
  }, live && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "live",
    dot: true
  }, "En directo"), seats != null && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "success"
  }, seats, " plazas")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 'var(--space-5)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      color: 'var(--brand-lilac)',
      font: 'var(--text-dice)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "dices",
    size: 14
  }), system), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--text-display-2)',
      letterSpacing: 'var(--ls-display)',
      textWrap: 'pretty'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      color: 'var(--text-muted)',
      font: 'var(--text-caption)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: gm,
    src: gmPhoto,
    size: 26,
    ring: true
  }), /*#__PURE__*/React.createElement("span", null, gm), distance && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "map-pin",
    size: 13
  }), /*#__PURE__*/React.createElement("span", null, distance))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-2)'
    }
  }, tags.map(t => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: t,
    label: t
  })))));
}
Object.assign(__ds_scope, { SwipeCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/matchmaking/SwipeCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/roldr-app/App.jsx
try { (() => {
const {
  BottomNav
} = window.RoldrDesignSystem_220ac8;
const NAV = [{
  icon: 'dices',
  label: 'Buscar'
}, {
  icon: 'sparkles',
  label: 'Matches'
}, {
  icon: 'message-circle',
  label: 'Mesas'
}, {
  icon: 'user',
  label: 'Perfil'
}];
function App() {
  const [entered, setEntered] = React.useState(false);
  const [tab, setTab] = React.useState(0);
  const [table, setTable] = React.useState(null);
  let screen;
  if (!entered) screen = /*#__PURE__*/React.createElement(Onboarding, {
    onEnter: () => setEntered(true)
  });else if (table) screen = /*#__PURE__*/React.createElement(TableDetail, {
    table: table,
    onBack: () => setTable(null)
  });else if (tab === 0) screen = /*#__PURE__*/React.createElement(Discover, {
    onOpen: setTable
  });else if (tab === 1) screen = /*#__PURE__*/React.createElement(Matches, {
    onOpen: m => setTable(window.ROLDR_DATA.tables.find(t => t.title === m.title))
  });else if (tab === 2) screen = /*#__PURE__*/React.createElement(Matches, {
    onOpen: m => setTable(window.ROLDR_DATA.tables.find(t => t.title === m.title))
  });else screen = /*#__PURE__*/React.createElement(Profile, null);
  return /*#__PURE__*/React.createElement("div", {
    className: "phone"
  }, /*#__PURE__*/React.createElement("div", {
    className: "viewport"
  }, screen), entered && !table && /*#__PURE__*/React.createElement(BottomNav, {
    items: NAV,
    active: tab,
    onChange: setTab
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/roldr-app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/roldr-app/Screens.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  Button,
  Chip,
  Badge,
  Card,
  Icon,
  Input,
  Avatar,
  TopBar,
  BottomNav,
  Sheet,
  SwipeCard,
  SwipeActions,
  MatchBanner
} = window.RoldrDesignSystem_220ac8;
const D = window.ROLDR_DATA;
function Onboarding({
  onEnter
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'url(../../assets/background-gradient.png) center/cover',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: 'var(--space-6) var(--screen-gutter) var(--space-8)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to top,rgba(10,9,12,.94) 0%,rgba(10,9,12,.35) 55%,rgba(10,9,12,.15) 100%)'
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.png",
    alt: "",
    style: {
      position: 'relative',
      width: 96,
      height: 96,
      marginBottom: 'var(--space-6)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--text-display-1)',
      letterSpacing: 'var(--ls-display)',
      textWrap: 'pretty'
    }
  }, "Desliza hasta", /*#__PURE__*/React.createElement("br", null), "tu pr\xF3xima mesa"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--text-body-lg)',
      color: 'var(--text-muted)',
      maxWidth: 300
    }
  }, "Partidas de rol cerca de ti y en l\xEDnea. T\xFA dices qu\xE9 te apetece jugar; el m\xE1ster dice si hay sitio."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    icon: "dices",
    onClick: onEnter
  }, "Empezar a buscar"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    fullWidth: true,
    onClick: onEnter
  }, "Ya tengo cuenta"))));
}
function Discover({
  onOpen
}) {
  const [i, setI] = React.useState(0);
  const [decision, setDecision] = React.useState(null);
  const [matched, setMatched] = React.useState(null);
  const [filters, setFilters] = React.useState(['Presencial']);
  const [sheet, setSheet] = React.useState(false);
  const deck = D.tables.slice(i, i + 3);
  const advance = d => {
    setDecision(d);
    const card = D.tables[i];
    setTimeout(() => {
      setDecision(null);
      setI(n => (n + 1) % D.tables.length);
      if (d === 'yes') setMatched(card);
    }, 260);
  };
  const toggle = t => setFilters(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    logoSrc: "../../assets/logo-d20.png",
    title: "Buscar mesa",
    actionIcon: "sliders-horizontal",
    action: () => setSheet(true)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      padding: '0 var(--screen-gutter) var(--space-3)',
      overflowX: 'auto'
    }
  }, D.filters.slice(0, 5).map(t => /*#__PURE__*/React.createElement(Chip, {
    key: t,
    label: t,
    selected: filters.includes(t),
    onClick: () => toggle(t),
    style: {
      flex: '0 0 auto'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      margin: '0 var(--screen-gutter)'
    }
  }, deck.map((t, k) => /*#__PURE__*/React.createElement(SwipeCard, _extends({
    key: t.id
  }, t, {
    offset: deck.length - 1 - k,
    decision: k === 0 ? decision : null,
    onClick: k === 0 ? () => onOpen(t) : undefined,
    style: {
      zIndex: 10 - k,
      cursor: k === 0 ? 'pointer' : 'default'
    }
  }))).reverse()), /*#__PURE__*/React.createElement(SwipeActions, {
    style: {
      padding: 'var(--space-5) 0'
    },
    onNo: () => advance('no'),
    onYes: () => advance('yes'),
    onSuper: () => advance('super')
  }), /*#__PURE__*/React.createElement(Sheet, {
    open: sheet,
    title: "Filtros",
    onClose: () => setSheet(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-2)',
      marginBottom: 'var(--space-5)'
    }
  }, D.filters.map(t => /*#__PURE__*/React.createElement(Chip, {
    key: t,
    label: t,
    selected: filters.includes(t),
    onClick: () => toggle(t)
  }))), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    onClick: () => setSheet(false)
  }, "Ver 24 mesas")), matched && /*#__PURE__*/React.createElement(MatchBanner, {
    title: matched.title,
    gm: matched.gm,
    onOpen: () => {
      setMatched(null);
      onOpen(matched);
    },
    onKeep: () => setMatched(null)
  }));
}
function TableDetail({
  table,
  onBack
}) {
  const [joined, setJoined] = React.useState(false);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    onBack: onBack,
    title: table.system.split(' · ')[0],
    actionIcon: "share-2"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      paddingBottom: 'var(--space-8)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 200,
      background: 'var(--gradient-brand)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--scrim-bottom)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 'var(--screen-gutter)',
      right: 'var(--screen-gutter)',
      bottom: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)'
    }
  }, table.live && /*#__PURE__*/React.createElement(Badge, {
    tone: "live",
    dot: true
  }, "En directo"), /*#__PURE__*/React.createElement(Badge, {
    tone: "success"
  }, table.seats, " plazas")), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--text-display-2)',
      letterSpacing: 'var(--ls-display)',
      textWrap: 'pretty'
    }
  }, table.title))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-5) var(--screen-gutter)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: table.gm,
    size: 48,
    ring: true,
    live: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body-strong)'
    }
  }, table.gm), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, "M\xE1ster \xB7 18 mesas dirigidas")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    icon: "message-circle"
  }, "Escribir")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--text-body-lg)',
      color: 'var(--text-muted)',
      textWrap: 'pretty'
    }
  }, table.pitch), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--stack-gap)'
    }
  }, [['calendar', table.when], ['map-pin', table.place], ['dices', table.system]].map(([ic, tx]) => /*#__PURE__*/React.createElement(Card, {
    key: tx,
    raised: true,
    padding: "12px 14px",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--brand-lilac)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-body)'
    }
  }, tx)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--text-title-2)',
      marginBottom: 'var(--space-3)'
    }
  }, "En la mesa"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, table.players.map((p, k) => /*#__PURE__*/React.createElement(Avatar, {
    key: p,
    name: p,
    size: 38,
    ring: k === 0,
    style: {
      marginLeft: k ? -10 : 0,
      boxShadow: '0 0 0 2px var(--bg)',
      borderRadius: 999
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, table.players.length, " jugando \xB7 ", table.seats, " libres"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--text-title-2)',
      marginBottom: 'var(--space-3)'
    }
  }, "C\xF3mo se juega aqu\xED"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-2)'
    }
  }, [...table.tags, 'Cámara opcional', 'Reglas en la mesa'].map(t => /*#__PURE__*/React.createElement(Chip, {
    key: t,
    label: t
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-3) var(--screen-gutter) var(--space-4)',
      borderTop: '1px solid var(--border)',
      background: 'rgba(19,17,25,.86)',
      backdropFilter: 'blur(var(--blur-glass))'
    }
  }, joined ? /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    fullWidth: true,
    icon: "check",
    onClick: () => setJoined(false)
  }, "Solicitud enviada a ", table.gm) : /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    icon: "dices",
    onClick: () => setJoined(true)
  }, "Pedir plaza")));
}
function Matches({
  onOpen
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    logoSrc: "../../assets/logo-d20.png",
    title: "Matches",
    actionIcon: "search"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 var(--screen-gutter) var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--stack-gap)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, "Mesas donde el m\xE1ster te ha guardado sitio."), D.matches.map(m => /*#__PURE__*/React.createElement(Card, {
    key: m.id,
    onClick: () => onOpen(m),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: m.gm,
    size: 46,
    ring: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-body-strong)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, m.title)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-caption)',
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, m.gm, " \xB7 ", m.last)), m.unread > 0 ? /*#__PURE__*/React.createElement(Badge, {
    tone: "live"
  }, m.unread) : /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, m.when.split(' ')[0]))), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--text-title-2)',
      marginTop: 'var(--space-4)'
    }
  }, "Guardadas"), /*#__PURE__*/React.createElement(Card, {
    raised: true,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--brand-lilac)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bookmark",
    size: 20
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: 'var(--text-body)'
    }
  }, "Ars Magica: el invierno del pacto"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm"
  }, "Ver"))));
}
function Profile() {
  const [online, setOnline] = React.useState(['Online', 'Presencial']);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    logoSrc: "../../assets/logo-d20.png",
    title: "Perfil",
    actionIcon: "settings"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 var(--screen-gutter) var(--space-8)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    ambient: true,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Nil Bosch",
    size: 64,
    live: true
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-title-2)'
    }
  }, "Nil Bosch"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, "Madrid \xB7 12 mesas jugadas"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "success"
  }, "Puntual")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--text-title-2)',
      marginBottom: 'var(--space-3)'
    }
  }, "Qu\xE9 me gusta jugar"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-2)'
    }
  }, ['Terror', 'Investigación', 'Rol pesado', 'One-shot', 'D&D 5e', 'Vaesen', 'Cyberpunk RED'].map(t => /*#__PURE__*/React.createElement(Chip, {
    key: t,
    label: t,
    selected: true
  })), /*#__PURE__*/React.createElement(Chip, {
    label: "A\xF1adir",
    icon: "plus"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--text-title-2)',
      marginBottom: 'var(--space-3)'
    }
  }, "C\xF3mo quiero jugar"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-2)'
    }
  }, ['Online', 'Presencial', 'Tardes', 'Fines de semana'].map(t => /*#__PURE__*/React.createElement(Chip, {
    key: t,
    label: t,
    selected: online.includes(t),
    onClick: () => setOnline(o => o.includes(t) ? o.filter(x => x !== t) : [...o, t])
  })))), /*#__PURE__*/React.createElement(Input, {
    label: "Ciudad",
    icon: "map-pin",
    defaultValue: "Madrid",
    hint: "Buscamos mesas en un radio de 15 km"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    fullWidth: true,
    icon: "log-out"
  }, "Cerrar sesi\xF3n")));
}
Object.assign(window, {
  Onboarding,
  Discover,
  TableDetail,
  Matches,
  Profile
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/roldr-app/Screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/roldr-app/data.js
try { (() => {
window.ROLDR_DATA = {
  tables: [{
    id: 't1',
    title: 'La Tumba de Aniquilación',
    system: 'D&D 5e · campaña larga',
    gm: 'Marta R.',
    tags: ['Terror', 'Presencial', 'Principiantes'],
    distance: 'a 3,2 km',
    seats: 2,
    live: true,
    when: 'Jueves 20:30 · cada semana',
    place: 'Local La Guarida, Malasaña',
    players: ['Marta R.', 'Diego S.', 'Alba N.', 'Iván P.'],
    pitch: 'Bajamos a la tumba con seis personajes y salimos con dos. Mesa dura, sin castigo gratuito: si negociáis bien con los muertos, os dejan pasar.'
  }, {
    id: 't2',
    title: 'Vaesen: el faro de Hålsö',
    system: 'Vaesen · one-shot',
    gm: 'Diego S.',
    tags: ['Investigación', 'Online', 'Sin experiencia'],
    distance: 'online',
    seats: 3,
    live: false,
    when: 'Sábado 17:00 · una sesión',
    place: 'Discord de Roldr',
    players: ['Diego S.', 'Lía M.'],
    pitch: 'Cuatro horas, un faro apagado y un pueblo que miente. Traed cuaderno: aquí se gana preguntando, no tirando.'
  }, {
    id: 't3',
    title: 'Cyberpunk RED: turno de noche',
    system: 'Cyberpunk RED · arco de 4',
    gm: 'Alba N.',
    tags: ['Acción', 'Presencial', 'Veteranos'],
    distance: 'a 1,1 km',
    seats: 1,
    live: false,
    when: 'Martes 21:00 · 4 sesiones',
    place: 'Café Runa, Lavapiés',
    players: ['Alba N.', 'Iván P.', 'Lía M.', 'Nil B.', 'Sara G.'],
    pitch: 'Sois el turno de noche de una clínica ilegal. Cada sesión entra un paciente que no debería existir.'
  }, {
    id: 't4',
    title: 'Ars Magica: el invierno del pacto',
    system: 'Ars Magica 5ª · campaña',
    gm: 'Iván P.',
    tags: ['Político', 'Online', 'Rol pesado'],
    distance: 'online',
    seats: 2,
    live: false,
    when: 'Domingo 18:00 · quincenal',
    place: 'Discord de Roldr',
    players: ['Iván P.', 'Marta R.'],
    pitch: 'Magos discutiendo por un río durante veinte años de juego. Poco combate, mucha carta escrita en latín macarrónico.'
  }],
  matches: [{
    id: 'm1',
    title: 'Vaesen: el faro de Hålsö',
    gm: 'Diego S.',
    last: '¿Te va bien empezar a las 17:15?',
    unread: 2,
    when: 'Sábado 17:00'
  }, {
    id: 'm2',
    title: 'Cyberpunk RED: turno de noche',
    gm: 'Alba N.',
    last: 'Te he guardado la última plaza.',
    unread: 0,
    when: 'Martes 21:00'
  }, {
    id: 'm3',
    title: 'La Tumba de Aniquilación',
    gm: 'Marta R.',
    last: 'Ficha revisada, todo correcto 👌',
    unread: 0,
    when: 'Jueves 20:30'
  }],
  filters: ['Presencial', 'Online', 'Principiantes', 'Veteranos', 'Terror', 'Investigación', 'One-shot', 'Campaña', 'Hoy', 'Este fin de semana']
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/roldr-app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.MatchBanner = __ds_scope.MatchBanner;

__ds_ns.SwipeActions = __ds_scope.SwipeActions;

__ds_ns.SwipeCard = __ds_scope.SwipeCard;

__ds_ns.BottomNav = __ds_scope.BottomNav;

__ds_ns.TopBar = __ds_scope.TopBar;

__ds_ns.Sheet = __ds_scope.Sheet;

__ds_ns.Avatar = __ds_scope.Avatar;

})();
