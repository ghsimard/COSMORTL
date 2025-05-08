import { CustomPDFKit, addHeader } from './pdfUtils';

// Function to create the first explanatory page with introduction and communication content
export const generateExplanatoryPage1 = (doc: CustomPDFKit): void => {
  // Add a new page with header
  doc.addPage();
  addHeader(doc);

  // Define margins and text width
  const startX = 75;  // Further reduced margin
  const textWidth = doc.page.width - (startX * 2);  // Wider text width
  const startY = doc.y + 15;  // Minimal space after header

  // Reset cursor position
  doc.x = startX;
  doc.y = startY;

  // Title with reduced spacing
  doc.fontSize(14)  // Smaller title
     .font('Helvetica-Bold')
     .text('ENCUESTA DE AMBIENTE ESCOLAR', {
       align: 'center'
     })
     .moveDown(2);  // Reduced space after title

  // Main text with tighter formatting
  doc.fontSize(10)  // Slightly smaller font for better fit
     .font('Helvetica')
     .text('La Encuesta de Ambiente escolar tiene el objetivo de dar a conocer al directivo docente la percepción que los actores de la comunidad tienen sobre el ambiente escolar en la Institución Educativa para que pueda identificar los ejes de acción para emprender las transformaciones en la IE. La encuesta recoge la percepción de un grupo de estudiantes, docentes y acudientes para tener información de primera mano sobre los aspectos que tienen relación con el ambiente escolar.', {
       align: 'justify',
       width: textWidth,
       indent: 0,
       lineGap: 0.5  // Tighter line spacing
     })
     .moveDown(0.5);

  doc.text('Para el Programa RLT y CLT el concepto de ambiente escolar se refiere a las dinámicas e interrelaciones que derivan de los procesos comunicativos, pedagógicos y convivenciales en la institución educativa. El ambiente escolar se reconoce como una de las variables que tiene mayor influencia en los aprendizajes en la escuela. En este sentido, es importante identificar los aspectos que desafían el liderazgo del directivo docente que participa en el Programa RLT y CLT.', {
       align: 'justify',
       width: textWidth,
       indent: 0,
       lineGap: 0.5
     })
     .moveDown(0.5);

  // Add content about comunicación with consistent tight spacing
  doc.text('La Encuesta de ambiente escolar indaga por tres componentes: comunicación; prácticas pedagógicas; y convivencia. La ', {
       continued: true,
       align: 'justify',
       width: textWidth,
       indent: 0,
       lineGap: 0.5
     })
     .font('Helvetica-Bold')
     .text('comunicación', { continued: true })
     .text(' ', { continued: true })
     .font('Helvetica')
     .text('se entiende como la capacidad de expresar las necesidades, intereses, posiciones, derechos e ideas propias de maneras claras y enfáticas (Programa Rectores Líderes Transformadores, 2017a) (1). La comunicación institucional fluida, con reglas claras y explícitas, facilita la interacción efectiva entre los docentes, los directivos, los estudiantes, las familias y otros miembros de la comunidad educativa. También facilita el trabajo en equipo, la resolución de problemas y conflictos, la construcción de metas comunes y el compromiso por los resultados. Implica construir relaciones basadas en el respeto por uno mismo y por los demás, usar un lenguaje que tenga un impacto más positivo en el otro, sin agredir. En relación con el ambiente escolar, la comunicación permite crear canales y mecanismos para promover la participación y la corresponsabilidad de los diferentes actores con los procesos de aprendizaje, lo que genera confianza y compromiso. Así mismo, permite reconocer y dar a conocer las innovaciones de las y los docentes para mejorar los aprendizajes, lo que genera redes de aprendizaje, impacta el clima laboral y la relación de estudiantes y familias con los docentes.', {
       align: 'justify',
       width: textWidth,
       indent: 0,
       lineGap: 0.5
     })
     .moveDown(0.5);

  // Add content about prácticas pedagógicas
  doc.text('Las ', {
       continued: true,
       align: 'justify',
       width: textWidth,
       indent: 0,
       lineGap: 0.5
     })
     .font('Helvetica-Bold')
     .text('prácticas pedagógicas', { continued: true })
     .text(' ', { continued: true })
     .font('Helvetica')
     .text('son el conjunto de acciones que las y los docentes emprender para que las y los estudiantes desarrollen sus competencias y mejores sus aprendizajes y no se limitan al aula de clase. ', {
       continued: true,
       align: 'justify',
       width: textWidth,
       indent: 0,
       lineGap: 0.5
     })
     .font('Helvetica-Oblique')
     .text('En relación con el ambiente escolar', {
       continued: true
     })
     .font('Helvetica')
     .text(', las prácticas pedagógicas impactan las emociones y creencias sobre la didáctica, la evaluación y la pertinencia de los procesos formativos que se dan en la institución educativa. El uso de espacios diferentes al aula de clase, la construcción de proyectos interdisciplinarios y la apertura a espacios de interacción con otras instituciones, facilitan y enriquecen los saberes de docentes y estudiantes pues los invita a comprender que tienen un lugar orgánico dentro de la comunidad desde su rol en la Institución Educativa, lo cual crea sentido de pertenencia y evidencia el poder transformador de la pedagogía. De la misma manera, tener altas expectativas de las niñas, niños y jóvenes, tener en cuenta sus necesidades e intereses para la construcción de los planes de aula, y tener en cuenta su dimensión afectiva y emocional cuando son evaluados, impacta las relaciones entre docentes, familias y estudiantes, lo cual deriva en relaciones más respetuosas y solidarias en la institución.', {
       align: 'justify',
       width: textWidth,
       indent: 0,
       lineGap: 0.5
     })
     .moveDown(12);  // Increased from 2 to 8 to add more space before the reference

  // Add first reference at the end of page 2
  doc.fontSize(7.5)  // Even smaller font for references
     .font('Helvetica-Oblique')
     .text('(1) Programa Rectores Líderes Transformadores (2017a). Cartilla del módulo 1: Gestión personal. Bogotá: Fundación Empresarios por la Educación.', {
       align: 'left',
       width: textWidth,
       indent: 0,
       lineGap: 0.25
     });
}; 