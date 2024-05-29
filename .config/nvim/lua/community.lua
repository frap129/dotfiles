-- AstroCommunity: import any community modules here
-- We import this file in `lazy_setup.lua` before the `plugins/` folder.
-- This guarantees that the specs are processed before any user plugins.

---@type LazySpec
return {
  "AstroNvim/astrocommunity",
  { import = "astrocommunity.code-runner.sniprun" },
  { import = "astrocommunity.colorscheme.nightfox-nvim" },
  { import = "astrocommunity.completion.coq_nvim", enabled = false },
  { import = "astrocommunity.editing-support.suda-vim" },
  { import = "astrocommunity.pack.bash" },
  { import = "astrocommunity.pack.cpp" },
  { import = "astrocommunity.pack.lua" },
  { import = "astrocommunity.pack.kotlin" },
  { import = "astrocommunity.pack.python" },
  { import = "astrocommunity.pack.rust" },
  { import = "astrocommunity.syntax.hlargs-nvim" },
  { import = "astrocommunity.syntax.vim-cool" },
  { import = "astrocommunity.terminal-integration.flatten-nvim" },
  -- import/override with your plugins folder
}
