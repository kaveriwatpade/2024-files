import {Pipe, PipeTransform, Injectable} from "@angular/core";

@Pipe({ name: 'search', pure: false})

@Injectable()
export class SearchPipe implements PipeTransform {

  transform(items: any, term: any): any {
    if (term === undefined) return items;

    return items.filter(function(item) {
      for(let property in item){
        if (item[property] === null){
          continue;
        }
        if(item[property].toString().toLowerCase().includes(term.toLowerCase())){
          return true;
        }
      }
      return false;
    });
  }
}