{
  description = "Portable CLI/TUI environment with shell tools";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        # Core interactive shell + CLI UX
        coreShell = with pkgs; [
          zsh
          zimfw
          bash
          bashInteractive
          bash-completion
          bat            # cat replacement
          eza            # ls replacement
          delta          # diff viewer
          zoxide         # cd replacement
          dust           # du replacement
          fd             # find replacement
          procs          # ps replacement
          ugrep          # fast grep
          fzf            # fuzzy finder
          jq             # JSON processor
          yq-go          # YAML processor
          zellij
        ];

        # Developer toolchain (editor, VCS, build tools, languages)
        devStack = with pkgs; [
          neovim
          git
          git-lfs
          curl
          wget
          openssh
          sshfs
          less
          which
          unzip
          zip
          pigz
          clang
          lld
          gnumake
          cmake
          pkg-config
          nodejs
          go
          rustup
          gh
          grpcurl
          lazygit
          meson
          pandoc
          pipx
          protobuf
          rmlint
          ruby
          apktool
          dex2jar
          scrcpy
          docker-compose
          luarocks
          mpv
          ollama
          just
          uv 
          python312
          python312Packages.python-lsp-server
          python312Packages.ipython
          ruff
          nodePackages.typescript
          nodePackages.prettier
        ];

        # System / infra / background utilities
        infraTools = with pkgs; [
          btop           # resource monitor
          fastfetch      # system info
          htop           # process viewer
          podman
          distrobox
          yadm           # dotfile manager
          syncthing      # file sync
          gvfs           # virtual filesystems
          tailscale      # VPN/mesh network
          lsof
          topgrade 
          nix-search-cli
        ];

        # Fonts kept separate for easy toggling
        fontPackages = with pkgs; [
          nerd-fonts.fira-code
          noto-fonts-color-emoji
        ];

        # All packages combined
        allPackages = coreShell ++ devStack ++ infraTools ++ fontPackages;

      in
      {
        packages = {
          default = pkgs.buildEnv {
            name = "nix-user-env";
            paths = allPackages;
            pathsToLink = [ "/bin" "/share" "/lib" ];
          };
        };
      }
    );
}
