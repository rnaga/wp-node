/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  private async assumeAdminUser(): Promise<void> {
    const wp = await this.appService.getWPContext();
    await wp.current.assumeUser(1);
  }

  @Get(':id')
  async get(@Param('id') id: number): Promise<string> {
    const wp = await this.appService.getWPContext();

    await this.assumeAdminUser();

    const result = await wp.utils.crud.post.get(parseInt(`${id}`));
    return JSON.stringify(result.data);
  }

  @Post()
  async createPost(@Body() postData: any): Promise<string> {
    const wp = await this.appService.getWPContext();

    await this.assumeAdminUser();

    console.log('Creating post with data:[', postData, ']');

    const result = await wp.utils.crud.post.create({
      post_title: postData.title,
      post_content: postData.content,
      post_type: 'post',
    });
    return JSON.stringify(result.data);
  }

  @Delete(':id')
  async deletePost(@Param('id') id: number): Promise<string> {
    const wp = await this.appService.getWPContext();

    await this.assumeAdminUser();

    const result = await wp.utils.crud.post.delete(parseInt(`${id}`));
    return JSON.stringify(result.data);
  }

  @Put(':id')
  async updatePost(
    @Param('id') id: number,
    @Body() postData: any,
  ): Promise<string> {
    const wp = await this.appService.getWPContext();
    await this.assumeAdminUser();

    const result = await wp.utils.crud.post.update(parseInt(`${id}`), {
      post_title: postData.title,
      post_content: postData.content,
      post_type: 'post',
    });
    return JSON.stringify(result.data);
  }
}
