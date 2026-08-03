{
  description = "Portable CLI/TUI environment with shell tools";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    mise = {
      url = "github:jdx/mise/v2026.7.18";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    herdr = {
      url = "github:ogulcancelik/herdr";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    tirith = {
      url = "github:sheeki03/tirith";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, mise, herdr, tirith }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
          overlays = [
            (final: prev: {
              pythonPackagesExtensions = prev.pythonPackagesExtensions ++ [
                (pythonFinal: pythonPrev: {
                  scipy = pythonPrev.scipy.overridePythonAttrs (_: {
                    doCheck = false;
                  });
                })
              ];
            })
          ];
        };

        # Core interactive shell + CLI UX
        coreShell = with pkgs; [
          zsh
          zimfw
          oh-my-posh
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
          ripgrep
          zellij
          tmux
          netcat
          rsync
        ];

        # Developer toolchain (editor, VCS, build tools, languages)
        devStack = with pkgs; [
          neovim
          git
          git-lfs
          curl
          wget
          openssh
          mosh
          sshfs
          less
          which
          unzip
          zip
          pigz
          gnumake
          cmake
          nodejs
          go
          rustup
          gh
          grpcurl
          lazygit
          meson
          pandoc
          protobuf
          rmlint
          apktool
          dex2jar
          scrcpy
          docker-compose
          just
          uv
          aube
          python312
          python312Packages.python-lsp-server
          python312Packages.ipython
          ruff
          bun
        ];

        # System / infra / background utilities
        infraTools = with pkgs; [
          btop           # resource monitor
          fastfetch      # system info
          htop           # process viewer
          podman
          yadm           # dotfile manager
          syncthing      # file sync
          gvfs           # virtual filesystems
          tailscale      # VPN/mesh network
          lsof
          topgrade 
          nix-search-cli
          bitwarden-cli
        ];

        # Fonts kept separate for easy toggling
        fontPackages = with pkgs; [
          nerd-fonts.fira-code
          noto-fonts-color-emoji
        ];

        # All packages combined
        allPackages = coreShell ++ devStack ++ infraTools ++ fontPackages ++ [
          mise.packages.${system}.default
          herdr.packages.${system}.default
          tirith.packages.${system}.default
        ];

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
