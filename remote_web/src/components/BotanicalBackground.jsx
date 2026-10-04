import React from 'react';

export default function BotanicalBackground() {
  return (
    <svg className="botanical-background" viewBox="0 0 660 650" fill="none" aria-hidden="true">
      <defs>
        <g id="garden-branch">
          <path d="M0 0C-15-130 12-260 0-420" stroke="currentColor" strokeWidth="3" />
          <path d="M-5-60C-96-63-113-132-103-166C-53-159-13-123-5-60ZM-5-130C64-126 102-181 97-222C44-217 6-182-5-130ZM0-211C-69-218-91-267-83-307C-30-294-5-259 0-211ZM2-275C62-283 78-331 67-365C25-347 8-315 2-275ZM2-348C-28-377-26-419-5-447C23-416 25-376 2-348Z" fill="currentColor" />
        </g>
      </defs>
      <use href="#garden-branch" transform="translate(520 700) rotate(-39) scale(1.55)" opacity=".07" />
      <use href="#garden-branch" transform="translate(490 680) rotate(-8) scale(1.35)" opacity=".14" />
      <use href="#garden-branch" transform="translate(630 695) rotate(24) scale(1.5)" opacity=".23" />
      <use href="#garden-branch" transform="translate(390 705) rotate(-65) scale(.9)" opacity=".11" />
    </svg>
  );
}
