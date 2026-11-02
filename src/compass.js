const DIRECTIONS=['N','NE','E','SE','S','SW','W','NW'];
const NAMES=['north','northeast','east','southeast','south','southwest','west','northwest'];

export function compassReadout(degrees){
 const angle=((degrees%360)+360)%360;
 const index=Math.round(angle/45)%8;
 const heading=String(Math.round(angle)%360).padStart(3,'0');
 return {heading,direction:DIRECTIONS[index],spoken:`Heading ${NAMES[index]}, ${heading} degrees`};
}
