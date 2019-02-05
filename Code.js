/**
 * Slack to Google Sheets Tool
 * Ben Collins, Jan 2019
 *
 * Uses Slack Slash Command to log book recommendation in Google Sheets
 * Supplements with data about the book from Google Books API
 *
 */


/**
 * listener function for post request from Slack with book name
 */
function doPost(e) {
  if (typeof e !== 'undefined') { 
    
    // setup the Sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sheet1');
    var lastRow = sheet.getLastRow();

    // extract the relevant data
    var parameter = e.parameter;
    var teamDomain = parameter.team_domain;
    var channelName = parameter.channel_name;
    var userName = parameter.user_name;
    var bookName = parameter.text;
    var date = new Date();
    var slackDetails = [date,teamDomain,channelName,userName,bookName];
    
    var responseUrl = parameter.response_url;

    // paste the slack details to the sheet
    sheet.getRange(lastRow + 1,1,1,5).setValues([slackDetails]);
    
    // retrieve the book details
    var bookData = getBookDetails(bookName);

    // check if we were able to retrieve book details
    if (bookData.length == 0) {
        // display slack data only
        sheet.getRange(lastRow + 1,6).setValue(['No book data found.']).setHorizontalAlignment('left');
        
        // return message when no book found
        return ContentService.createTextOutput(':books:Thank you for your book recommendation. Unfortunately, that book was not found.');
    }
    else {
        // display data in Sheet
        var imageUrl = bookData.pop();
        sheet.getRange(lastRow + 1,6).setFormula('=image("' + imageUrl +'")');
        sheet.getRange(lastRow + 1,7,1,11).setValues([bookData]);

        // return message when book successfully found
        var result = {
            'text': ':books::nerd_face: Thank you for your book recommendation! :tada:',
            'attachments': [
                {
                    'title': bookData[0],
                    'author_name': bookData[2],
                    'image_url': imageUrl
                }
            ]
        }
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    
  }
}

/**
 * function to call google books api to retrieve book data
 */
function getBookDetails(bookName) {

    // put your favourite book as the 'backup'
    bookName = bookName || 'Data Smart';

    // google books api
    var url = 'https://www.googleapis.com/books/v1/volumes?q=' + encodeURI(bookName) + '&country=US';
    
    // empty array to hold book data
    var bookData = [];

    try {
        var response = UrlFetchApp.fetch(url);
        var results = JSON.parse(response);
        
        if (results.totalItems) {

            var book = results.items[0]; // choose first book
            
            // Get the book info
            var title = book.volumeInfo.title || 'No Data Found';
            var subtitle = book.volumeInfo.subtitle || 'No Data Found';
            var authors = book.volumeInfo.authors.join() || 'No Data Found'; // join to put multiple authors into string
            var publishedDate = book.volumeInfo.publishedDate || 'No Data Found';
            var pageCount = book.volumeInfo.pageCount || 'No Data Found';
            var avRating = book.volumeInfo.averageRating || 'No Data Found';
            var imageUrl = book.volumeInfo.imageLinks.thumbnail || 'No Data Found';
            
            // Get the sale info
            var saleInfo = book.saleInfo;
            if (saleInfo.saleability === 'FOR_SALE') {
                var listPrice = saleInfo.listPrice.amount || 'No Data Found';
                var retailPrice = saleInfo.retailPrice.amount || 'No Data Found';
                var currency = saleInfo.listPrice.currencyCode || 'No Data Found';
                var buyLink = saleInfo.buyLink || 'No Data Found';   
            }
            else {
                var listPrice = 'No Data Found';
                var retailPrice = 'No Data Found';
                var currency = 'No Data Found';
                var buyLink = 'No Data Found';
            }
            var webReaderLink = book.accessInfo.webReaderLink || 'No Data Found';

            bookData.push(title,subtitle,authors,publishedDate,pageCount,avRating,listPrice,retailPrice,currency,webReaderLink,buyLink,imageUrl);
        }
    }
    catch(e) {
        Logger.log('Unable to fetch book data. Hint: ' + e);
    }
    return bookData;
}
