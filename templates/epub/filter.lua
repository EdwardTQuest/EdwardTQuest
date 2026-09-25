-- filter.lua (EPUB) — the same manuscript dialect, rendered for readers.
-- * "Chapter I. Title" -> <h2><span class="label">Chapter I</span>Title</h2>
-- * ::: front / ::: back keep their headings as chapters (the level is what matters for splitting)
-- * ::: epigraph -> div.epigraph ; line blocks are left to pandoc (div.line-block)
-- * a plate before chapter N when meta.plates lists it
local has_parts = false
local plates = {}
local chapter_count = 0

function Meta(m)
  if m.has_parts ~= nil then has_parts = (m.has_parts == true) or (pandoc.utils.stringify(m.has_parts) == 'true') end
  if m.plates then
    for _, p in ipairs(m.plates) do
      plates[tonumber(pandoc.utils.stringify(p.before_chapter))] = { path = pandoc.utils.stringify(p.path), caption = pandoc.utils.stringify(p.caption) }
    end
  end
  return m
end

local function split_label(s)
  local lab, rest = s:match('^((%u%l+%s+[%dIVXLCivxlc]+)[%.:]%s+)(.+)$')
  if lab then
    local word = lab:match('^(%a+)')
    local ok = { Chapter=1, Book=1, Part=1, Canto=1, Letter=1, Essay=1, Section=1, Act=1, Scene=1, Volume=1 }
    if ok[word] then return (lab:gsub('[%.:]%s+$', '')), rest end
  end
  local l2, r2 = s:match('^([IVXLC]+)%.%s+(.+)$')
  if l2 then return l2, r2 end
  return nil, s
end

function Header(h)
  local is_chapter = (has_parts and h.level == 2) or ((not has_parts) and (h.level == 1 or h.level == 2))
  if not is_chapter then return h end
  chapter_count = chapter_count + 1
  local s = pandoc.utils.stringify(h.content)
  local lab, rest = split_label(s)
  local content
  if lab and rest ~= '' and rest ~= s then
    content = pandoc.Inlines({ pandoc.Span(pandoc.Inlines(pandoc.Str(lab)), pandoc.Attr('', {'label'})), pandoc.Str(rest) })
  else
    content = h.content
  end
  local out = {}
  if plates[chapter_count] then
    local p = plates[chapter_count]
    table.insert(out, pandoc.Figure(pandoc.Inlines(pandoc.Image(pandoc.Inlines(pandoc.Str(p.caption)), p.path)), { long = { pandoc.Plain(pandoc.Inlines(pandoc.Str(p.caption))) } }))
  end
  table.insert(out, pandoc.Header(h.level, content, h.attr))
  return out
end

function Div(d)
  local cls = d.classes[1]
  if cls == 'epigraph' then d.classes = { 'epigraph' } return d end
  if cls == 'verse' then d.classes = { 'verse' } return d end
  if cls == 'front' or cls == 'back' or cls == 'dedication' then return d.content end
  return d
end
