{
  description = "Portable mise bootstrap environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    mise = {
      url = "github:jdx/mise/v2026.7.18";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    tirith = {
      url = "github:sheeki03/tirith";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { nixpkgs, flake-utils, mise, tirith, ... }:
    flake-utils.lib.eachSystem [ "x86_64-linux" ] (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        packages.default = with pkgs; buildEnv {
          name = "nix-user-env";
          paths = [
            mise.packages.${system}.default
            tirith.packages.${system}.default
            apktool
            bash
            bash-completion
            curl
            dex2jar
            git
            gvfs
            htop
            less
            lsof
            mosh
            nerd-fonts.fira-code
            netcat
            nix-search-cli
            noto-fonts-color-emoji
            openssh
            pigz
            podman
            procs
            rmlint
            rsync
            scrcpy
            sshfs
            syncthing
            tailscale
            ugrep
            unzip
            wget
            which
            yadm
            zimfw
            zip
            zsh
          ];
          pathsToLink = [ "/bin" "/sbin" "/share" ];
          postBuild = ''
            ln -s ${zimfw}/zimfw.zsh $out/share/zimfw.zsh
          '';
        };
      });
}
