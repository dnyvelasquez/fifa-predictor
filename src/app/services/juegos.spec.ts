import { TestBed } from '@angular/core/testing';

import { Juegos } from './juegos';

describe('Juegos', () => {
  let service: Juegos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Juegos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
