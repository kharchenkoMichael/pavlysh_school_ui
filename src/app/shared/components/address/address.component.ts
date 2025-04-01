import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-address',
  templateUrl: './address.component.html',
  styleUrls: ['./address.component.scss'],
  imports: [CommonModule],
  standalone: true,
})
export class AddressComponent implements OnInit {
  ngOnInit() {}
}
