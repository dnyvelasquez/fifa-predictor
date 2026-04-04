import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fixture } from './fixture';

describe('Fixture', () => {
  let component: Fixture;
  let fixture: ComponentFixture<Fixture>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fixture]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fixture);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
