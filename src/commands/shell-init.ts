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
    });
}
