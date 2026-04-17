import { TestBed } from '@angular/core/testing';

import { Asignacion } from './asignacion';

describe('Asignacion', () => {
  let service: Asignacion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Asignacion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
