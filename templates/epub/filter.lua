-- filter.lua (EPUB) — the same manuscript dialect, rendered for readers. Top-down walk in
-- Pandoc() so metadata (plates, has_parts) is known before the headings are seen.
--   * "Chapter I. Title" -> <h2><span class="label">Chapter I</span>Title</h2>
--   * ::: front / ::: back / ::: dedication -> their headings become chapters (not counted for plates)
--   * ::: epigraph -> div.epigraph ; line blocks are pandoc's own div.line-block
--   * a plate (figure with caption) before chapter N when meta.plates lists it
local has_parts = false
local plates = {}
local chapter_count = 0
local LABELS = { Chapter=1, Book=1, Part=1, Canto=1, Letter=1, Essay=1, Section=1, Act=1, Scene=1, Volume=1 }

local function split_label(s)
  local lab, rest = s:match('^(%u%l+%s+[%w-]+)[%.:]%s+(.+)$')
  if lab and LABELS[lab:match('^(%a+)')] then return lab, rest end
  local l2, r2 = s:match('^([IVXLC]+)%.%s+(.+)$')
  if l2 then return l2, r2 end
  return nil, s
end

local function header(h, division)
  local is_chapter = (has_parts and h.level == 2) or ((not has_parts) and h.level <= 2)
  if not is_chapter then return { h } end
  local out = {}
  if not division then
    chapter_count = chapter_count + 1
    local p = plates[chapter_count]
    if p then
      local img = pandoc.Image(pandoc.Inlines(pandoc.Str(p.caption)), p.path, p.caption)
      table.insert(out, pandoc.Figure({ pandoc.Plain({ img }) }, { long = { pandoc.Plain({ pandoc.Str(p.caption) }) } }, pandoc.Attr('', { 'plate' })))
    end
  end
  local s = pandoc.utils.stringify(h.content)
  local lab, rest = nil, s
  if not division then lab, rest = split_label(s) end
  local content = h.content
  if lab and rest ~= s then
    content = pandoc.Inlines({ pandoc.Span(pandoc.Inlines(pandoc.Str(lab)), pandoc.Attr('', { 'label' })), pandoc.Str(rest) })
  end
  table.insert(out, pandoc.Header(2, content, h.attr))
  return out
end

local function walk(blocks, division)
  local out = {}
  for _, b in ipairs(blocks) do
    if b.t == 'Header' then
      for _, x in ipairs(header(b, division)) do table.insert(out, x) end
    elseif b.t == 'Div' then
      local cls = b.classes[1]
      if cls == 'front' or cls == 'back' or cls == 'dedication' then
        for _, x in ipairs(walk(b.content, true)) do table.insert(out, x) end
      elseif cls == 'epigraph' or cls == 'verse' then
        b.classes = { cls }
        table.insert(out, b)
      else
        table.insert(out, b)
      end
    else
      table.insert(out, b)
    end
  end
  return out
end

function Pandoc(doc)
  local m = doc.meta
  if m.has_parts ~= nil then has_parts = (m.has_parts == true) or (pandoc.utils.stringify(m.has_parts) == 'true') end
  if m.plates then
    for _, p in ipairs(m.plates) do
      plates[tonumber(pandoc.utils.stringify(p.before_chapter))] = { path = pandoc.utils.stringify(p.path), caption = pandoc.utils.stringify(p.caption) }
    end
  end
  return pandoc.Pandoc(walk(doc.blocks, false), doc.meta)
end
