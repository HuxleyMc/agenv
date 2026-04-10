import { Command } from "commander";
import { version } from "../package.json";
import { registerInit } from "./commands/init";
import { registerCreate } from "./commands/create";
import { registerSwitch } from "./commands/switch";
import { registerList } from "./commands/list";
import { registerStatus } from "./commands/status";
import { registerDelete } from "./commands/delete";
import { registerShellInit } from "./commands/shell-init";
import { registerClaude } from "./commands/claude";

const program = new Command();

program
  .name("agenv")
  .description("Manage multiple .agents/ directories per project")
  .version(version);

registerInit(program);
registerCreate(program);
registerSwitch(program);
registerList(program);
registerStatus(program);
registerDelete(program);
registerShellInit(program);
registerClaude(program);

await program.parseAsync(process.argv);
