// ISBN13 (INTERNATIONAL STANDARD BOOK NUMBER) validator

#include "stdafx.h"

// Prototip funkcije
int fISBN13(char *ISBN);
int main(void)
{
	int rez = fISBN13("978-0-306-40615-7"); //Ispravan ISBN13
	printf_s("%d \n",rez);
    return 0;
}

// Tijelo funkcije
int fISBN13(char *ISBN){
	
	char ISBN_2[14]={};
	int i = 0,br = 0,sum = 0;
	 
	while(ISBN[i] != *"\0"){

		if(((ISBN[i]>47)&&(ISBN[i]<58))||((ISBN[i] == *"-")||(ISBN[i] == *"-"))){ //Provjera broja i "-" divider-a u ASCII tablici
			if((ISBN[i] != *"-")||(ISBN[i] != *"-")){ //"Micanje dividera"
				
				//Novi niz bez "-" znakova
				//ISBN_2[] - Uvijek sadrzava zapis i to u int "formatu"
				//br - sadrzava broj znamenki
				ISBN_2[br] = ISBN[i] - 48; //Oduzimanje 48, zbog ASCII tablice (pretvaranje char -> int)
				
				if(br<=11){ //Sumiranje za Luhnov algoritam
					sum += ISBN_2[br] * (br % 2 == 1 ? 3 : 1); //Znamenke od lijeva na desno se mnoze sa 1 ili 3
				}
				br++;

			}
		} 
		else{ 
			return 1; //Nedozvoljeni znak
		}	
		i++;  

   }
   if(((ISBN_2[0] == 9)&&(ISBN_2[1] == 7))&&((ISBN_2[2] == 8)||(ISBN_2[2] == 9))) {	//Prve tri znamenke, za sada se koriste 978 i 979
	   if(br == 13){
			int remainder = sum % 10; //Modulo 10
			int checkDigit = 10 - remainder; //Zadnji znak
			if (checkDigit == 10) checkDigit = 0; //Ako je 10 -> 0
			if (checkDigit == ISBN_2[12]) return 0; //Ispravan ISBN13
			else return 4; //Neispravna zadnja znamenka (checksum)
	   }
	   else{
		return 2; //Neodgovarajuci broj znamenki
	   } 
   }else{
	return 3; //Neispravne prve tri znamenke
   }

}

