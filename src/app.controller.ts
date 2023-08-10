import { Controller, Get, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Request, Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getQuestion(@Req() req: Request, @Res() res: Response): Promise<any> {
    const answeredQuestions = req.cookies['answered-questions'] as string;
    let answeredQuestionsArray = answeredQuestions
      ? answeredQuestions.split(',')
      : [];
    if (req.query.response) {
      answeredQuestionsArray = answeredQuestionsArray.concat(
        req.query.response as string,
      );
    }
    answeredQuestionsArray = [...new Set(answeredQuestionsArray)];
    const response = await this.appService.getSurvey(answeredQuestionsArray);
    res.cookie('answered-questions', answeredQuestionsArray.join(','), {
      httpOnly: true,
    });
    res.send(response);
  }
}
