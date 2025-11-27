
import { ICommandBus, ICommand } from './interfaces';

export class CommandBus implements ICommandBus {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private readonly maxHistory: number = 50;

  execute(command: ICommand): void {
    console.log(`[CommandBus] Executing: ${command.name}`);
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack on new action
    
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (command) {
      console.log(`[CommandBus] Undoing: ${command.name}`);
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      console.log(`[CommandBus] Redoing: ${command.name}`);
      command.execute();
      this.undoStack.push(command);
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
