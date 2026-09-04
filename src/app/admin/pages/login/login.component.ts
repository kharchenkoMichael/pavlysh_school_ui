import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-rozklad-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  username = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    document.body.classList.add('rozklad-open');
  }

  ngOnDestroy(): void {
    document.body.classList.remove('rozklad-open');
  }

  submit(): void {
    if (this.busy() || !this.username || !this.password) { return; }
    this.busy.set(true);
    this.error.set(null);

    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => {
        // Повертаємо туди, звідки не пустило: людина йшла до конкретної
        // сторінки, а не «в адмінку взагалі».
        const back = this.route.snapshot.queryParamMap.get('povernutysia');
        this.router.navigateByUrl(back || '/rozklad/ohliad');
      },
      error: (error: ApiError) => {
        this.busy.set(false);
        this.password = '';
        this.error.set(
          error.status === 503
            ? 'Логін на сервері не налаштовано (бракує JWT_SECRET).'
            : error.message);
      },
    });
  }
}
