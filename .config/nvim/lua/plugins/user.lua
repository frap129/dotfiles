-- You can also add or configure plugins by creating files in this `plugins/` folder
-- PLEASE REMOVE THE EXAMPLES YOU HAVE NO INTEREST IN BEFORE ENABLING THIS FILE
-- Here are some examples:

---@type LazySpec
return {
  {
    "ray-x/lsp_signature.nvim",
    event = "InsertEnter",
    opts = {
      bind = true,
      handler_opts = {
        border = "rounded",
      },
    },
  },
  {
    "nvim-neo-tree/neo-tree.nvim",
    opts = {
      filesystem = {
        filtered_items = {
          visible = true,
          hide_dotfiles = false,
          hide_gitignored = false,
        },
      },
    },
  },
  {
    "akinsho/toggleterm.nvim",
    opts = {
      direction = "float",
    },
  },
  {
    "linux-cultist/venv-selector.nvim",
    dependencies = { "neovim/nvim-lspconfig", "nvim-telescope/telescope.nvim", "mfussenegger/nvim-dap-python" },
    opts = {
      -- Your options go here
      -- name = "venv",
      -- auto_refresh = false
    },
    event = "VeryLazy", -- Optional: needed only if you want to type `:VenvSelect` without a keymapping
    keys = {
      -- Keymap to open VenvSelector to pick a venv.
      { "<leader>vs", "<cmd>VenvSelect<cr>" },
      -- Keymap to retrieve the venv from a cache (the one previously used for the same project directory).
      { "<leader>vc", "<cmd>VenvSelectCached<cr>" },
    },
  },
  {
    "folke/snacks.nvim",
    opts = {
      animate = {
        enabled = true,
      },
      bigfile = {
        enabled = true,
      },
      image = {
        enabled = false,
      },
      input = {
        enabled = true,
      },
      quickfile = {
        enabled = true,
      },
      words = {
        enabled = true,
      },
    },
  },
  {
    "Bekaboo/dropbar.nvim",
    dependencies = {
      "nvim-telescope/telescope-fzf-native.nvim",
      build = "make",
    },
    event = "UIEnter",
    opts = {},
    specs = {
      {
        "rebelot/heirline.nvim",
        optional = true,
        opts = function(_, opts) opts.winbar = nil end,
      },
    },
  },
  {
    "ariedov/android-nvim",
    config = function() require("android-nvim").setup() end,
  },
  {
    "coder/claudecode.nvim",
    dependencies = { "folke/snacks.nvim" },
    config = true,
    keys = {
      { "<leader>a", nil, desc = "AI/Claude Code" },
      { "<leader>ac", "<cmd>ClaudeCode<cr>", desc = "Toggle Claude" },
      { "<leader>af", "<cmd>ClaudeCodeFocus<cr>", desc = "Focus Claude" },
      { "<leader>ar", "<cmd>ClaudeCode --resume<cr>", desc = "Resume Claude" },
      { "<leader>aC", "<cmd>ClaudeCode --continue<cr>", desc = "Continue Claude" },
      { "<leader>am", "<cmd>ClaudeCodeSelectModel<cr>", desc = "Select Claude model" },
      { "<leader>ab", "<cmd>ClaudeCodeAdd %<cr>", desc = "Add current buffer" },
      { "<leader>as", "<cmd>ClaudeCodeSend<cr>", mode = "v", desc = "Send to Claude" },
      {
        "<leader>as",
        "<cmd>ClaudeCodeTreeAdd<cr>",
        desc = "Add file",
        ft = { "NvimTree", "neo-tree", "oil", "minifiles" },
      },
      -- Diff management
      { "<leader>aa", "<cmd>ClaudeCodeDiffAccept<cr>", desc = "Accept diff" },
      { "<leader>ad", "<cmd>ClaudeCodeDiffDeny<cr>", desc = "Deny diff" },
    },
  },
  {
    "NickvanDyke/opencode.nvim",
    dependencies = {
      -- Recommended for better prompt input, and required to use `opencode.nvim`'s embedded terminal — otherwise optional
      { "folke/snacks.nvim", opts = { input = { enabled = true } } },
    },
    config = function()
      vim.g.opencode_opts = {
        -- Your configuration, if any — see `lua/opencode/config.lua`
      }

      -- Required for `opts.auto_reload`
      vim.opt.autoread = true

      -- Recommended keymaps
      vim.keymap.set("n", "<leader>ot", function() require("opencode").toggle() end, { desc = "Toggle opencode" })
      vim.keymap.set("n", "<leader>oA", function() require("opencode").ask() end, { desc = "Ask opencode" })
      vim.keymap.set(
        "n",
        "<leader>oa",
        function() require("opencode").ask "@cursor: " end,
        { desc = "Ask opencode about this" }
      )
      vim.keymap.set(
        "v",
        "<leader>oa",
        function() require("opencode").ask "@selection: " end,
        { desc = "Ask opencode about selection" }
      )
      vim.keymap.set(
        "n",
        "<leader>on",
        function() require("opencode").command "session_new" end,
        { desc = "New opencode session" }
      )
      vim.keymap.set(
        "n",
        "<leader>oy",
        function() require("opencode").command "messages_copy" end,
        { desc = "Copy last opencode response" }
      )
      vim.keymap.set(
        "n",
        "<S-C-u>",
        function() require("opencode").command "messages_half_page_up" end,
        { desc = "Messages half page up" }
      )
      vim.keymap.set(
        "n",
        "<S-C-d>",
        function() require("opencode").command "messages_half_page_down" end,
        { desc = "Messages half page down" }
      )
      vim.keymap.set(
        { "n", "v" },
        "<leader>os",
        function() require("opencode").select() end,
        { desc = "Select opencode prompt" }
      )

      -- Example: keymap for custom prompt
      vim.keymap.set(
        "n",
        "<leader>oe",
        function() require("opencode").prompt "Explain @cursor and its context" end,
        { desc = "Explain this code" }
      )
    end,
  },
}
