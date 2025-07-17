import { Injectable } from '@nestjs/common';
import Application from '@rnaga/wp-node/application';

@Injectable()
export class AppService {
  getWPContext() {
    // Initialize the application context
    const context = Application.getContext();

    // Return the WordPress context
    return context;
  }
}
