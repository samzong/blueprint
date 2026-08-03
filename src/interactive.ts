import select from "@inquirer/select";

export type Choice<Value> = {
  description?: string;
  disabled?: boolean | string;
  name: string;
  value: Value;
};

export async function chooseOne<Value>(
  message: string,
  choices: Choice<Value>[],
  nonInteractiveMessage: string,
): Promise<Value> {
  if (!process.stdin.isTTY || !process.stderr.isTTY) {
    throw new Error(nonInteractiveMessage);
  }

  try {
    return await select(
      { choices, loop: false, message, pageSize: 7 },
      { input: process.stdin, output: process.stderr },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ExitPromptError") {
      throw new Error("Cancelled");
    }
    throw error;
  }
}
