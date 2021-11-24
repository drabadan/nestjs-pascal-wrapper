import { Body, Controller, Get, Logger, Post, Request } from '@nestjs/common';
import { AppService, MessageService } from './app.service';

export interface ScriptActionResult {
  success: string;
  commandID: string;
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private messageService: MessageService,
  ) {
    this.appService.launch();
  }

  @Post('stealth/message')
  async postStealthMessage(
    @Request() req: any,
    @Body() body: any,
  ): Promise<string> {
    Logger.log(
      `Received message ${JSON.stringify(body)}`,
      this.constructor.name,
    );
    if (body && Object.keys(body).length) {
      this.messageService.receivedMessage(body);
    }

    /* if (req.readable) {
       // body is ignored by NestJS -> get raw body from request
       const raw = await rawbody(req);
       const text = raw.toString().trim();
       console.log('body:', text);
     }*/

    // const message = this.appService.sendMessage();
    // Logger.log('sent message' + message, this.constructor.name);
    // return message;

    if (this.messageService.sendArray?.length) {
      const answer = this.messageService.sendArray.pop();
      Logger.log(`Sengind answer ${answer}`);
      return answer;
    }

    return '';
  }
}
