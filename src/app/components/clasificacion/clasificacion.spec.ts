import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Clasificacion } from './clasificacion';

describe('Clasificacion', () => {
  let component: Clasificacion;
  let fixture: ComponentFixture<Clasificacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Clasificacion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Clasificacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
