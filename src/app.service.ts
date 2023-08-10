import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError, AxiosResponse } from 'axios';
import { Observable, catchError, firstValueFrom } from 'rxjs';

interface Service {
  rule: string;
  title: {
    de: string;
  };
}

type ServiceReponse = { [key: string]: Service };

interface Answer {
  result: string;
  title: string;
  title_alt: string;
}

interface Question {
  answers: Answer[];
  title: string;
  title_alt: string;
}

type QuestionResponse = { [key: string]: Question };

interface SurveyResponse {
  nextQuestion: QuestionResponse;
  availableServices: Service[];
}

const getQuestion = (
  rule: { [key: string]: string },
  index: number,
): string => {
  const ruleStr = Object.keys(rule)[0];
  const result = ruleStr.split('-')[index];
  return result.split('(')[0];
};

const getStringRule = (rule: { [key: string]: string }): string => {
  const ruleStr = Object.keys(rule)[0];
  return ruleStr;
};

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private questions: QuestionResponse = {};
  private services: ServiceReponse = {};
  constructor(private readonly httpService: HttpService) {
    this.getQuestions().subscribe((response) => {
      this.questions = response.data;
    });
    this.getServices().subscribe((response) => {
      this.services = response.data;
    });
  }

  async getSurvey(userQuestions: string[]): Promise<any> {
    const allRules = await this.getAllRules();
    // Select First Question Alphabetically
    if (userQuestions.length === 0) {
      const firstQuestion = getQuestion(allRules[0], 0);
      return {
        nextQuestion: this.getQuestionByName(firstQuestion),
        availableServices: [],
      };
    }
    const availableRules = allRules.filter((rule) => {
      const ruleStr = getStringRule(rule);
      return !userQuestions.some((userQuestion) => {
        const questionName = userQuestion.split('(')[0];
        const ruleContainsQuestion = ruleStr.includes(questionName);
        const ruleContainsAnswer = ruleStr.includes(userQuestion);
        return ruleContainsQuestion && !ruleContainsAnswer;
      });
    });
    const allQuestionsFromAvailableTopics = availableRules.flatMap((rule) =>
      getStringRule(rule).split('-'),
    );
    console.log(allQuestionsFromAvailableTopics);
    const alreadyAnsweredQuestions = userQuestions.map(
      (question) => question.split('(')[0],
    );
    let nextSurveyQuestion: QuestionResponse | undefined = undefined;
    for (const nextQuestion of allQuestionsFromAvailableTopics) {
      const contained = [];
      for (const answeredQuestion of alreadyAnsweredQuestions) {
        contained.push(!nextQuestion.includes(answeredQuestion));
      }
      if (contained.every((element) => element)) {
        const name = nextQuestion.split('(')[0];
        nextSurveyQuestion = this.getQuestionByName(name);
      }
    }
    return {
      nextQuestion: nextSurveyQuestion,
      availableServices: availableRules,
    };
  }

  getQuestionByName(name: string): QuestionResponse {
    return { [name]: this.questions[name] };
  }

  getQuestions(): Observable<AxiosResponse<QuestionResponse>> {
    const response = this.httpService
      .get(
        'https://nui-testchallenge-default-rtdb.europe-west1.firebasedatabase.app/services_backend/questions.json',
      )
      .pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw 'An error happened!';
        }),
      );
    return response;
  }

  getServices(): Observable<AxiosResponse<ServiceReponse>> {
    const response = this.httpService
      .get(
        'https://nui-testchallenge-default-rtdb.europe-west1.firebasedatabase.app/services_backend/topics.json',
      )
      .pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw 'An error happened!';
        }),
      );
    return response;
  }

  async getAllRules(): Promise<{ [key: string]: string }[]> {
    const services = this.services;
    const rules: { [key: string]: string }[] = [];
    Object.keys(services).forEach((service) => {
      const ruleArray = services[service].rule.split('||');
      ruleArray.forEach((rule) => rules.push({ [rule]: service }));
    });
    return rules.sort((a, b) => {
      if (Object.keys(a)[0] > Object.keys(b)[0]) {
        return 1;
      }
      if (Object.keys(a)[0] < Object.keys(b)[0]) {
        return -1;
      }
      return 0;
    });
  }
}
