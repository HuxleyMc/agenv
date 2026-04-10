import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import pc from "picocolors";

type ShellType = "bash" | "zsh" | "fish" | "starship" | "pwsh";

function detectShell(): ShellType {
  const shell = process.env.SHELL || "";
  if (shell.includes("zsh")) return "zsh";
  if (shell.includes("fish")) return "fish";
  // Default to bash for anything else
  return "bash";
}

function isValidShell(shell: string): shell is ShellType {
  return ["bash", "zsh", "fish", "starship", "pwsh"].includes(shell);
}

function generateBashSnippet(bin: string): string {
  return (
    "_agenv_prompt() {\n" +
    "  local kit\n" +
    `  kit="$(${bin} status --porcelain 2>/dev/null)" || return\n` +
    '  printf \' (%s)\' "$kit"\n' +
    "}\n" +
    'if [[ "$PS1" != *\'$(_agenv_prompt)\'* ]]; then\n' +
    '  PS1="${PS1%\\$ }\\$(_agenv_prompt) \\$ "\n' +
    "fi\n"
  );
}

function generateZshSnippet(bin: string): string {
  return (
    "_agenv_precmd() {\n" +
    "  local kit\n" +
    `  kit="$(${bin} status --porcelain 2>/dev/null)" || return\n` +
    '  RPROMPT="%F{green}⬡ ${kit}%f"\n' +
    "}\n" +
    "autoload -Uz add-zsh-hook\n" +
    "add-zsh-hook precmd _agenv_precmd\n"
  );
}

function generateFishSnippet(bin: string): string {
  return (
    "function _agenv_kit\n" +
    `  ${bin} status --porcelain 2>/dev/null\n` +
    "end\n"
  );
}

function generateStarshipSnippet(bin: string): string {
  return (
    "[custom.agenv]\n" +
    `command = "${bin} status --porcelain"\n` +
    `when = "${bin} status --porcelain"\n` +
    'format = "⬡ [$output]($style) "\n' +
    'style = "green"\n'
  );
}

function generatePwshSnippet(bin: string): string {
  return (
    "function _agenv_prompt_segment {\n" +
    `  $kit = & ${bin} status --porcelain 2>$null\n` +
    '  if ($kit) { " ($kit)" } else { "" }\n' +
    "}\n" +
    "$originalPrompt = Get-Command prompt -ErrorAction SilentlyContinue\n" +
    "if ($originalPrompt) {\n" +
    "  $origDef = $originalPrompt.ScriptBlock\n" +
    "  function prompt {\n" +
    "    (& $origDef) + (_agenv_prompt_segment)\n" +
    "  }\n" +
    "}\n"
  );
}

function generateInstructions(shell: ShellType, bin: string): string {
  switch (shell) {
    case "bash":
      return (
        `# Shell integration: add the following to ~/.bashrc\n` +
        `#\n` +
        `#   eval "$(${bin} shell-init bash)"\n` +
        `#\n` +
        `# Then restart your shell or run: source ~/.bashrc\n`
      );
    case "zsh":
      return (
        `# Shell integration: add the following to ~/.zshrc\n` +
        `#\n` +
        `#   eval "$(${bin} shell-init zsh)"\n` +
        `#\n` +
        `# Then restart your shell or run: source ~/.zshrc\n`
      );
    case "fish":
      return (
        `# Shell integration: add the following to ~/.config/fish/config.fish\n` +
        `#\n` +
        `#   eval "$(${bin} shell-init fish)"\n` +
        `#\n` +
        `# Then restart your shell or run: source ~/.config/fish/config.fish\n`
      );
    case "starship":
      return (
        `# Shell integration: paste the snippet above into ~/.config/starship.toml\n` +
        `#\n` +
        `# Then restart your shell.\n`
      );
    case "pwsh":
      return (
        `# Shell integration: paste the snippet above into $PROFILE\n` +
        `#\n` +
        `# Then restart your shell or run: . $PROFILE\n`
      );
  }
}

function shellConfigPath(shell: ShellType, home: string): string | null {
  switch (shell) {
    case "bash": return join(home, ".bashrc");
    case "zsh": return join(home, ".zshrc");
    case "fish": return join(home, ".config", "fish", "config.fish");
    default: return null;
  }
}

function isAlreadyIntegrated(shell: ShellType, home: string): boolean {
  const configPath = shellConfigPath(shell, home);
  if (!configPath) return false;
  try {
    const contents = readFileSync(configPath, "utf8");
    return contents.includes(`shell-init ${shell}`);
  } catch {
    return false;
  }
}

export function registerShellInit(program: Command): void {
  program
    .command("shell-init [shell]")
    .description("Emit shell integration snippet")
    .option("--bin <path>", "custom binary path in emitted snippet", "agenv")
    .action((shell: string | undefined, opts: { bin: string }) => {
      // Determine which shell to use
      let targetShell: ShellType;
      if (shell) {
        if (!isValidShell(shell)) {
          console.error(pc.red(`error: unsupported shell "${shell}". Valid shells: bash, zsh, fish, starship, pwsh`));
          process.exit(1);
        }
        targetShell = shell;
      } else {
        targetShell = detectShell();
      }

      // Generate and emit the appropriate snippet
      let snippet: string;
      switch (targetShell) {
        case "bash":
          snippet = generateBashSnippet(opts.bin);
          break;
        case "zsh":
          snippet = generateZshSnippet(opts.bin);
          break;
        case "fish":
          snippet = generateFishSnippet(opts.bin);
          break;
        case "starship":
          snippet = generateStarshipSnippet(opts.bin);
          break;
        case "pwsh":
          snippet = generatePwshSnippet(opts.bin);
          break;
      }

      console.log(snippet);
      const home = process.env.HOME ?? "";
      if (!isAlreadyIntegrated(targetShell, home)) {
        process.stderr.write(generateInstructions(targetShell, opts.bin));
      }
    });
}
