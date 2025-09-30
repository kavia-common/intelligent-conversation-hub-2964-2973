import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root component that renders the top navigation bar and the primary
 * view container. Applies the Ocean Professional theme and serves as
 * the host for the chat page layout.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Multi-Agent Chatbot';
}
