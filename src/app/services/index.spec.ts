import { TestBed } from '@angular/core/testing';

import { Index } from './index';

describe('Index', () => {
  let service: Index;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Index);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
