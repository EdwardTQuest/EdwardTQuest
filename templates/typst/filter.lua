-- filter.lua — pandoc Lua filter: manuscript.md -> the Typst the house template expects.
-- Runs with `pandoc -t typst --lua-filter templates/typst/filter.lua`.
--   * chapter headings "Chapter I. Title" -> #chlabel.update("Chapter I") + a heading with the title
--   * the first chapter outside a ::: front division is preceded by #mainmatter() (folio restarts at 1)
--   * line blocks (verse) -> #verse[ ... ] with kept indentation
--   * ::: front / ::: back / ::: dedication -> chapter-styled divisions; ::: epigraph -> #epigraph[]
--   * a plate before chapter N when meta.plates lists it
--   * the first paragraph after a chapter heading opens in small caps (first two or three words)
-- The walk is top-down in Pandoc() so a heading knows whether it sits inside a front division;
-- pandoc's own element-wise filtering runs bottom-up, which is exactly wrong for that.

local has_parts = false
local opening_sc = true
local plates = {}
local on_sections = false
local anchor_count = 0
local main_started = false

local function raw(s) return pandoc.RawBlock('typst', s) end
local function esc(s) return (s:gsub('\\', '\\\\'):gsub('"', '\\"')) end
local function chapter_level() if has_parts then return 2 else return 1 end end

local LABELS = { Chapter=1, Book=1, Part=1, Canto=1, Letter=1, Essay=1, Section=1, Act=1, Scene=1, Volume=1 }

local function split_label(inl)
  local s = pandoc.utils.stringify(inl)
  local lab, rest = s:match('^(%u%l+%s+[%w-]+)[%.:]%s+(.+)$')
  if lab and LABELS[lab:match('^(%a+)')] then return lab, pandoc.Inlines(pandoc.Str(rest)) end
  local l2, r2 = s:match('^([IVXLC]+)%.%s+(.+)$')
  if l2 then return l2, pandoc.Inlines(pandoc.Str(r2)) end
  local bare = s:match('^(%u%l+%s+[%w-]+)$')
  if bare and LABELS[bare:match('^(%a+)')] then return bare, nil end
  if s:match('^[IVXLC]+$') or s:match('^%d+$') then return s, nil end
  return nil, inl
end

local function smallcaps_opening(p)
  local need = 2
  local first = pandoc.utils.stringify(p.content):match('^(%S+)')
  if first and #first <= 2 then need = 3 end
  local head, tail, words = {}, {}, 0
  for _, el in ipairs(p.content) do
    if words < need then
      table.insert(head, el)
      if el.t == 'Space' then words = words + 1 end
    else
      table.insert(tail, el)
    end
  end
  if words < need then return p end
  table.remove(head)                       -- the Space that closed the run
  local content = pandoc.Inlines({ pandoc.SmallCaps(pandoc.Inlines(head)), pandoc.Space() })
  for _, el in ipairs(tail) do table.insert(content, el) end
  return pandoc.Para(content)
end

-- returns a list of blocks for a heading; `division` is true inside ::: front/back
local function header_blocks(h, division)
  local out = {}
  local lvl = h.level
  local is_chapter = (has_parts and lvl == 2) or ((not has_parts) and lvl <= 2)
  if is_chapter then
    if not division and not main_started then
      table.insert(out, raw('#mainmatter()'))
      main_started = true
    end
    if not division then
      anchor_count = anchor_count + 1
      local p = plates[anchor_count]
      if p then table.insert(out, raw('#plate("' .. esc(p.path) .. '", [' .. p.caption .. '])')) end
    end
    local lab, title = nil, h.content
    if not division then lab, title = split_label(h.content) end
    if lab then
      table.insert(out, raw('#chlabel.update("' .. esc(lab) .. '")'))
    else
      table.insert(out, raw('#chlabel.update(none)'))
    end
    if title == nil then
      -- a bare label ("Chapter IV", "XII"): the label is the title, shown once
      table.insert(out, raw('#chlabel.update(none)'))
      title = pandoc.Inlines(pandoc.Str(lab))
    end
    table.insert(out, pandoc.Header(chapter_level(), title))
    return out, true
  end
  if has_parts and lvl == 1 then
    table.insert(out, h)
    return out, false
  end
  if not division and on_sections and lvl == 3 then
    anchor_count = anchor_count + 1
    local p = plates[anchor_count]
    if p then table.insert(out, raw('#plate("' .. esc(p.path) .. '", [' .. p.caption .. '])')) end
  end
  table.insert(out, pandoc.Header(chapter_level() + (lvl - 2), h.content))
  return out, false
end

local function walk(blocks, division)
  local out = {}
  local after_chapter = false
  for _, b in ipairs(blocks) do
    if b.t == 'Header' then
      local hb, is_ch = header_blocks(b, division)
      for _, x in ipairs(hb) do table.insert(out, x) end
      after_chapter = is_ch
    elseif b.t == 'Div' then
      local cls = b.classes[1]
      if cls == 'front' or cls == 'back' or cls == 'dedication' then
        for _, x in ipairs(walk(b.content, true)) do table.insert(out, x) end
      elseif cls == 'epigraph' then
        local inner = pandoc.write(pandoc.Pandoc(walk(b.content, division)), 'typst')
        table.insert(out, raw('#epigraph[\n' .. inner .. ']'))
      elseif cls == 'verse' then
        for _, x in ipairs(walk(b.content, division)) do table.insert(out, x) end
      else
        table.insert(out, b)
      end
      after_chapter = false
    elseif b.t == 'Para' then
      if after_chapter and opening_sc then table.insert(out, smallcaps_opening(b)) else table.insert(out, b) end
      after_chapter = false
    else
      table.insert(out, b)
      after_chapter = false
    end
  end
  return out
end

function LineBlock(lb)
  -- pandoc's typst writer marks a line's leading spaces as "~" (non-breaking spaces); that
  -- indentation becomes a measured #h() so turnovers and indented verse keep their shape.
  local lines = {}
  for _, line in ipairs(lb.content) do
    local body = pandoc.write(pandoc.Pandoc({ pandoc.Plain(line) }), 'typst')
    body = body:gsub('\n+$', '')
    local lead = body:match('^[~ ]*')
    local n = 0
    for _ in lead:gmatch('~') do n = n + 1 end
    body = body:sub(#lead + 1)
    if n > 0 then body = '#h(' .. (n * 0.55) .. 'em)' .. body end
    table.insert(lines, body)
  end
  return raw('#verse[\n' .. table.concat(lines, ' \\\n') .. '\n]')
end

function Pandoc(doc)
  local m = doc.meta
  if m.has_parts ~= nil then has_parts = (m.has_parts == true) or (pandoc.utils.stringify(m.has_parts) == 'true') end
  if m.opening_smallcaps ~= nil then opening_sc = not (pandoc.utils.stringify(m.opening_smallcaps) == 'false') end
  if m.plates_on_sections ~= nil then on_sections = (m.plates_on_sections == true) or (pandoc.utils.stringify(m.plates_on_sections) == 'true') end
  if m.plates then
    for _, p in ipairs(m.plates) do
      plates[tonumber(pandoc.utils.stringify(p.before_anchor))] = { path = pandoc.utils.stringify(p.path), caption = pandoc.utils.stringify(p.caption) }
    end
  end
  return pandoc.Pandoc(walk(doc.blocks, false), doc.meta)
end
