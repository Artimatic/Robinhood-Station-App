import { Component, OnInit, Input, OnChanges, SimpleChanges, Inject } from '@angular/core';
import { DataSource } from '@angular/cdk/collections';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/merge';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import * as moment from 'moment';

import { BacktestService, Stock, AlgoParam } from '../shared';
import { ChartDialogComponent } from '../chart-dialog';

@Component({
  selector: 'app-rh-table',
  templateUrl: './rh-table.component.html',
  styleUrls: ['./rh-table.component.css']
})
export class RhTableComponent implements OnInit, OnChanges {
  @Input() data: AlgoParam[];
  @Input() displayedColumns: string[];
  private stockList: Stock[] = [];
  rhDatabase = new RhDatabase();
  dataSource: RhDataSource | null;
  actionable: boolean = true;
  recommendation: string = 'buy';

  animal: string;
  name: string;

  constructor(private algo: BacktestService, public dialog: MatDialog) { }

  ngOnInit() {
    this.dataSource = new RhDataSource(this.rhDatabase);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.data) {
      this.getData(changes.data.currentValue);
    }
  }

  getData(algoParam) {
    algoParam.forEach((param) => {
      this.algo.getInfo(param).subscribe((stockData) => {
        stockData.stock = param.ticker;
        stockData.totalReturns = +((stockData.totalReturns*100).toFixed(2));
        this.rhDatabase.addStock(stockData);
      });
    });
  }

  openDialog(event, index): void {
    console.log(event, index);
    const currentDate   = moment().format('YYYY-MM-DD');
    const pastDate      = moment().subtract(3, 'years').format('YYYY-MM-DD');
    const requestBody   = {
        ticker: event.stock,
        start: pastDate,
        end: currentDate,
        deviation: event.recommendedDifference
    };

    let dialogRef = this.dialog.open(ChartDialogComponent, {
      width: '800px',
      data: requestBody
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.animal = result;
    });
  }
}


export class RhDatabase {
  dataChange: BehaviorSubject<Stock[]> = new BehaviorSubject<Stock[]>([]);
  get data(): Stock[] { return this.dataChange.value; }

  constructor() {}

  addStock(stock: Stock) {
    const copiedData = this.data.slice();
    copiedData.push(stock);
    this.dataChange.next(copiedData);
  }
}

export class RhDataSource extends DataSource<any> {
  _filterChange = new BehaviorSubject('');
  get filter(): string { return this._filterChange.value; }
  set filter(filter: string) { this._filterChange.next(filter); }

  constructor(private _rhDatabase: RhDatabase) {
    super();
  }

  connect(): Observable<Stock[]> {
    const displayDataChanges = [
      this._rhDatabase.dataChange,
      this._filterChange,
    ];

    return Observable.merge(...displayDataChanges).map(() => {
      return this._rhDatabase.data.slice().filter((item: Stock) => {
        let searchStr = (item.stock).toLowerCase();
        return searchStr.indexOf(this.filter.toLowerCase()) != -1;
      });
    });
  }

  disconnect() {}
}