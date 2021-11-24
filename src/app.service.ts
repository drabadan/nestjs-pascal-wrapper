import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { BehaviorSubject, lastValueFrom, Subject } from 'rxjs';

export type CommandArgument = string | number | boolean;
export const DELIMITER = ' ';
export const QUOTE_CHAR = '|';

export interface IMessage {
  methodName: string;
  argsLen: number;
  commandId: string;
  args: CommandArgument[];
  responseValue?: any;
  toString(): string;
}

export interface IStealthQueue {
  messagesMap: Map<string, IMessage>;
  buildMessage(
    methodName: string,
    resolve: (value) => void,
    args?: any[],
  ): IMessage;
}

export type MessageKeys = keyof IMessage;

export abstract class MessageBase implements IMessage {
  private _properties: Record<MessageKeys, CommandArgument | CommandArgument[]>;

  get methodName(): string {
    return this._properties.methodName as string;
  }

  set methodName(value: string) {
    this._properties.methodName = value;
  }

  get argsLen(): number {
    return this._properties.argsLen as number;
  }

  set argsLen(value: number) {
    this._properties.argsLen = value;
  }

  get commandId(): string {
    return this._properties.commandId as string;
  }

  get args(): CommandArgument[] {
    return this._properties.args as CommandArgument[];
  }

  set args(value: CommandArgument[]) {
    this._properties['args'] = value;
  }

  constructor(...args: any[]) {
    this._properties = {} as any;
    this._properties.commandId = crypto.randomBytes(2).toString('hex');
    this.methodName = args[0].methodName;
    this.argsLen = args[0].argsLen;
    this.args = args[0].args;
  }

  toString(): string {
    return Object.values(this._properties)
      .map((el) => `${QUOTE_CHAR}${el?.toString()}${QUOTE_CHAR}`)
      .join(DELIMITER);
  }
}

export class SimpleMessage extends MessageBase { }

export enum MethodTypeEnum {
  Simple,
  Awaitable,
}

export const STEALTH_METHODS: {
  [methodName: string]: MethodTypeEnum;
} = {
  AddToSystemJournal: MethodTypeEnum.Simple,
  Backpack: MethodTypeEnum.Awaitable,
  Self: MethodTypeEnum.Awaitable,
  Dead: MethodTypeEnum.Awaitable,
};

// implements IStealthQueue {
@Injectable()
export class MessageService {
  obsMap: Map<string, Subject<any>> = new Map();
  sendArray: string[] = [];

  buildMessage(methodName: string, args: any[] = []): IMessage {
    Logger.log(`Building message ${methodName}`);
    switch (STEALTH_METHODS[methodName]) {
      case MethodTypeEnum.Simple:
        return new SimpleMessage({ methodName, args, argsLen: args.length });
      case MethodTypeEnum.Awaitable:
        const message = new SimpleMessage({
          methodName,
          args,
          argsLen: args.length,
        });

        this.obsMap.set(message.commandId, new Subject<IMessage>());
        return message;
      default:
        throw `Unknown method: ${methodName}`;
    }
  }

  buildAndSendMessage(methodName: string, args: any[] = []): IMessage {
    const messageObj = this.buildMessage(methodName, args);
    this.sendArray.push(messageObj.toString());
    return messageObj;
  }

  receivedMessage(message: { [key: string]: any }): void {
    Logger.log(
      `1 Queue size: ${this.obsMap.size},
       commandId: ${Object.keys(message)[0]}`,
    );
    /*if (this.messagesMap.has(Object.keys(message)[0])) {
      const obs = this.messagesMap.get(Object.keys(message)[0]);
      obs.responseValue = message[obs.commandId];
      this.messagesMap.delete(obs.commandId);
      this.message$.next(obs);
    }

    if (this.callbackMap.has(Object.keys(message)[0])) {
      const resolve = this.callbackMap.get(Object.keys(message)[0]);
      if (typeof resolve === 'function') {
        resolve(message[Object.keys(message)[0]]);
      }
    }*/

    const commandId = Object.keys(message)[0];
    const value = message[commandId];
    if (this.obsMap.has(commandId)) {
      this.obsMap.get(commandId).next(value);
      this.obsMap.get(commandId).complete();
      this.obsMap.delete(commandId);
    }

    Logger.log(
      `2 Queue size: ${this.obsMap.size},
       commandId: ${Object.keys(message)[0]}`,
    );
  }
}

/**
 * 
 * Script Hiding
 * 
 * // Halt constraint
 * while not Dead do
 * // Message 1
 *  UseSkill('Hiding');
 * // Message 2
 *  Wait(3000);
 * end;
 * 
 */


@Injectable()
export class AppService {
  private backpack: string;
  private sending = false;
  constructor(private messageService: MessageService) { }

  async launch(): Promise<void> {
    // `|FindType| |2| |${crypto.randomBytes(2).toString('hex')}| |0xE75, 0x02878568|`;
    // const messageObj = this.buildMessage('AddToSystemJournal', ['hello world']);

    if (!this.backpack && !this.sending) {
      this.sending = true;
      const messageObj: IMessage = this.messageService.buildAndSendMessage('Backpack');
      if (messageObj) {
        this.backpack = await lastValueFrom(
          this.messageService.obsMap.get(messageObj.commandId),
        );
        Logger.log(
          `Observable Backpack value=${this.backpack.toString()}`,
          this.constructor.name,
        );

        const deadMessage = this.messageService.buildAndSendMessage('Dead');
        const isDead = await lastValueFrom(
          this.messageService.obsMap.get(deadMessage.commandId),
        );
        Logger.log(`Observable dead value=${isDead}`, this.constructor.name);
      }

      const addToSystemJournalMessage = this.messageService.buildAndSendMessage(
        'AddToSystemJournal',
        ['hello igor'],
      );
    }
  }
}
