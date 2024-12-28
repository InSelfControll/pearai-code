{ inputs, ... }@flakeContext:
{ system }:
let
  pkgs = inputs.nixpkgs.legacyPackages."${system}";
in
pkgs.mkShell
{ }
